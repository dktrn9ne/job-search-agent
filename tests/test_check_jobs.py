import copy
from datetime import datetime, timezone
import importlib.util
from pathlib import Path
import unittest
import subprocess
import sys
import json
import tempfile

SCRIPT = Path(__file__).resolve().parents[1] / 'skills/job-search-agent/scripts/check_jobs.py'
spec = importlib.util.spec_from_file_location('check_jobs', SCRIPT)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)
NOW = datetime(2026, 9, 30, 16, tzinfo=timezone.utc)


def record():
    return {'company': 'Example', 'title': 'Product Manager', 'requisition_id': '42',
            'url': 'https://jobs.example.com/posting?id=42', 'posting_status': 'open',
            'verified_at': '2026-09-30T14:00:00Z', 'verification_source': 'employer page',
            'employment_type': 'employee',
            'gates': {name: {'status': 'pass', 'evidence': 'verified proof'}
                      for name in ('location', 'work_authorization', 'qualifications')},
            'compensation': {'currency': 'USD', 'type': 'base', 'period': 'year',
                             'minimum': 130000, 'maximum': 180000, 'source': 'employer band'}}


class Checks(unittest.TestCase):
    def setUp(self):
        self.job = record()
        self.policy = {'minimum_base_usd': 120000}

    def result(self, history=None):
        return checker.check_job(self.job, self.policy, history or [], NOW)

    def test_eligible(self):
        self.assertEqual(self.result()['decision'], 'eligible')

    def test_base_below_floor(self):
        self.job['compensation'].update(minimum=80000, maximum=110000)
        self.assertEqual(self.result()['decision'], 'reject')

    def test_straddling_floor_is_review(self):
        self.job['compensation']['minimum'] = 100000
        self.assertEqual(self.result()['decision'], 'review')

    def test_exact_floor_passes(self):
        self.job['compensation']['minimum'] = 120000
        self.assertEqual(self.result()['decision'], 'eligible')

    def test_ote_never_establishes_base(self):
        for kind in ('OTE', 'total', 'equity', None):
            with self.subTest(kind=kind):
                self.job['compensation']['type'] = kind
                self.assertEqual(self.result()['decision'], 'review')

    def test_hourly_illustration_not_base(self):
        self.job['employment_type'] = 'contract'
        self.job['compensation'].update(period='hour', minimum=75, maximum=85,
                                        hours_per_week=40, weeks_per_year=52)
        result = self.result()
        self.assertEqual(result['decision'], 'review')
        self.assertIn('156,000.00', result['notes'][0])
        self.assertIn('not guaranteed', result['notes'][0])

    def test_hourly_does_not_invent_hours(self):
        self.job['compensation'].update(period='hour', minimum=100, maximum=120)
        self.assertEqual(self.result()['notes'], [])
        self.assertEqual(self.result()['decision'], 'review')

    def test_annual_contract_remains_review(self):
        self.job['employment_type'] = 'contract'
        self.assertEqual(self.result()['decision'], 'review')

    def test_foreign_currency_is_review(self):
        self.job['compensation']['currency'] = 'CAD'
        self.assertEqual(self.result()['decision'], 'review')

    def test_missing_pay_is_review(self):
        self.job.pop('compensation')
        self.assertEqual(self.result()['decision'], 'review')

    def test_missing_lower_bound_review(self):
        self.job['compensation'].pop('minimum')
        self.assertEqual(self.result()['decision'], 'review')

    def test_invalid_ranges_review(self):
        for low, high in ((190000, 130000), (-1, 150000), ('130000', 150000), (True, 150000), (float('nan'), 150000)):
            with self.subTest(low=low):
                self.job['compensation'].update(minimum=low, maximum=high)
                self.assertEqual(self.result()['decision'], 'review')

    def test_required_gate_failure_is_reject(self):
        for name in self.job['gates']:
            with self.subTest(name=name):
                job = record()
                job['gates'][name]['status'] = 'fail'
                self.assertEqual(checker.check_job(job, self.policy, [], NOW)['decision'], 'reject')

    def test_unknown_qualification_not_rejection(self):
        self.job['gates']['qualifications']['status'] = 'unknown'
        self.assertEqual(self.result()['decision'], 'review')

    def test_pass_without_evidence_not_pass(self):
        self.job['gates']['location'].pop('evidence')
        self.assertEqual(self.result()['decision'], 'review')

    def test_remote_title_does_not_override_location(self):
        self.job['title'] = 'Remote Product Manager'
        self.job['gates']['location']['status'] = 'fail'
        self.assertEqual(self.result()['decision'], 'reject')

    def test_closed_rejects(self):
        self.job['posting_status'] = 'closed'
        self.assertEqual(self.result()['decision'], 'reject')

    def test_stale_future_naive_and_missing_verification_review(self):
        for value in ('2026-09-20T14:00:00Z', '2026-10-01T14:00:00Z', '2026-09-30T14:00:00', None, 'garbage'):
            with self.subTest(value=value):
                self.job['verified_at'] = value
                self.assertEqual(self.result()['decision'], 'review')

    def test_offset_time_supported(self):
        self.job['verified_at'] = '2026-09-30T09:00:00-05:00'
        self.assertEqual(self.result()['decision'], 'eligible')

    def test_old_posting_with_current_open_verification_passes(self):
        self.job['posted_at'] = '2025-01-01'
        self.assertEqual(self.result()['decision'], 'eligible')

    def test_applied_requisition_dedupes_cross_board(self):
        self.assertEqual(self.result([{'company': 'EXAMPLE', 'requisition_id': '42', 'url': 'https://other.example/42', 'status': 'submitted'}])['decision'], 'already_applied')

    def test_rejected_application_still_duplicate(self):
        self.assertEqual(self.result([{**self.job, 'status': 'rejected'}])['decision'], 'already_applied')

    def test_uncertain_submission_blocks_retry(self):
        self.assertEqual(self.result([{**self.job, 'status': 'submission-uncertain'}])['decision'], 'review')

    def test_prepared_is_not_applied(self):
        self.assertEqual(self.result([{**self.job, 'status': 'prepared'}])['decision'], 'eligible')

    def test_url_removes_only_known_tracking(self):
        self.assertEqual(checker.canonical_url('https://JOBS.example.com/apply/?id=42&utm_source=li#x'),
                         'https://jobs.example.com/apply?id=42#x')
        self.assertNotEqual(checker.canonical_url('https://jobs.example/apply?id=42'),
                            checker.canonical_url('https://jobs.example/apply?id=43'))

    def test_alias_urls_dedupe(self):
        self.job['alternate_urls'] = ['https://board.example/jobs/abc']
        self.assertEqual(self.result([{'url': 'https://board.example/jobs/abc?utm_campaign=x', 'status': 'applied'}])['decision'], 'already_applied')

    def test_hash_routed_requisitions_are_distinct(self):
        self.assertNotEqual(checker.canonical_url('https://ats.example/#/jobs/42'),
                            checker.canonical_url('https://ats.example/#/jobs/43'))

    def test_distinct_requisitions_not_fuzzy_deduped(self):
        other = {**record(), 'url': 'https://jobs.example.com/posting?id=43', 'requisition_id': '43'}
        results = checker.evaluate({'jobs': [self.job, other], 'policy': self.policy}, NOW)
        self.assertEqual([r['decision'] for r in results], ['eligible', 'eligible'])

    def test_batch_duplicates(self):
        results = checker.evaluate({'jobs': [self.job, copy.deepcopy(self.job)], 'policy': self.policy}, NOW)
        self.assertEqual([r['decision'] for r in results], ['review', 'duplicate'])

    def test_duplicate_closed_record_prevents_eligible_first(self):
        closed = {**record(), 'posting_status': 'closed'}
        results = checker.evaluate({'jobs': [self.job, closed], 'policy': self.policy}, NOW)
        self.assertEqual(results[0]['decision'], 'review')
        self.assertEqual(results[1]['original_decision'], 'reject')
        self.assertIn('Posting confirmed closed', results[1]['reasons'])

    def test_whitespace_is_not_evidence(self):
        self.job['gates']['location']['evidence'] = '   '
        self.assertEqual(self.result()['decision'], 'review')

    def test_null_optional_objects_review_without_crash(self):
        self.job.update(compensation=None, gates=None, alternate_urls=None)
        self.assertEqual(self.result()['decision'], 'review')

    def test_null_employers_do_not_collide_by_req(self):
        self.job['company'] = None
        other = {**record(), 'company': None, 'url': 'https://different.example/42', 'status': 'submitted'}
        self.assertEqual(self.result([other])['decision'], 'review')

    def test_failed_gate_without_evidence_is_unknown(self):
        self.job['gates']['qualifications'] = {'status': 'fail'}
        self.assertEqual(self.result()['decision'], 'review')

    def test_blank_sources_review(self):
        for field in ['verification_source', 'compensation']:
            self.job = record()
            if field == 'compensation':
                self.job[field]['source'] = '   '
            else:
                self.job[field] = '  '
            self.assertEqual(self.result()['decision'], 'review')

    def test_invalid_floor_empty_batch(self):
        with self.assertRaises(ValueError):
            checker.evaluate({'policy': {'minimum_base_usd': -1}}, NOW)

    def test_cli_success_and_bad_inputs(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'input.json'
            path.write_text(json.dumps({'jobs': [record()], 'policy': self.policy}))
            command = [sys.executable, str(SCRIPT), str(path)]
            result = subprocess.run(command + ['--now', NOW.isoformat()], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)[0]['decision'], 'eligible')
            result = subprocess.run(command + ['--now', 'not-a-time'], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            path.write_text('{broken')
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            path.unlink()
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)

    def test_invalid_policy_fails(self):
        with self.assertRaises(ValueError):
            checker.evaluate({'policy': {'verification_max_age_hours': -1}}, NOW)
        self.policy['minimum_base_usd'] = -1
        with self.assertRaises(ValueError):
            self.result()


if __name__ == '__main__':
    unittest.main()
