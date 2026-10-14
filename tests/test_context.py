from test_check_jobs import checker, record, NOW
import unittest
class ContextChecks(unittest.TestCase):
 def check(self, mapping=None):
  job=record()
  if mapping is not None: job['requirement_evidence']=mapping
  return checker.check_job(job,{'require_requirement_evidence':True},[],NOW)['decision']
 def test_missing_map_reviews(self): self.assertEqual(self.check(),'review')
 def test_unknown_required_reviews(self): self.assertEqual(self.check([{'requirement':'SaaS experience','required':True,'assessment':'unknown'}]),'review')
 def test_proof_and_preferences(self):
  proof={'requirement':'SaaS experience','required':True,'assessment':'met','candidate_evidence':'Confirmed role','source_ref':'private:resume#1'}
  self.assertEqual(self.check([proof]),'eligible')
  self.assertEqual(self.check([{**proof,'assessment':'unmet'}]),'reject')
  self.assertEqual(self.check([{**proof,'required':False,'assessment':'unknown'}]),'eligible')
