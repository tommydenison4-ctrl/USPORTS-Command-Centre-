import copy, unittest
import refresh_results

class ResultRefreshTests(unittest.TestCase):
    def test_retraining_rejects_equal_count_with_a_missing_verified_source(self):
        previous={'profiles':{'a':{'games':2,'sources':['one','two']}}}
        def game(source):return {'source':source,'away':{'id':'a'},'home':{'id':'b'}}
        self.assertFalse(refresh_results.covers_previous(previous,[game('one'),game('three')]))
        self.assertFalse(refresh_results.covers_previous(previous,[game('one')]))
        self.assertTrue(refresh_results.covers_previous(previous,[game('one'),game('two'),game('three')]))

    def test_unavailable_plays_preserve_metrics_while_final_advances(self):
        metrics={'ypp':7.2,'median':4,'expl':.1,'neg':.3,'sack':.02,'tempo':55}
        previous={'asOf':'2026-10-03','model':{'verified':'coefficients'},
                  'profiles':{tid:{'games':6,'off':copy.deepcopy(metrics),'defense':copy.deepcopy(metrics)} for tid in ('windsor','queens')},
                  'coverage':{'completedGames':60}}
        game={'id':'2026-10-10-windsor-queens','date':'2026-10-10','status':'final',
              'away':'windsor','home':'queens','awayScore':25,'homeScore':22,
              'source':refresh_results.national.COMPOSITE+'?d=2026-10-10'}
        updated=refresh_results.update(previous,{'schedule':[game]},[])
        self.assertEqual(updated['model'],previous['model'])
        self.assertEqual(updated['profiles']['windsor']['off'],metrics)
        self.assertEqual(updated['profiles']['windsor']['resultGames'],1)
        self.assertEqual(updated['profiles']['windsor']['pf'],25)
        self.assertEqual(updated['profiles']['queens']['pa'],25)
        self.assertGreater(updated['profiles']['windsor']['elo'],updated['profiles']['queens']['elo'])
        self.assertNotIn('resultGames',previous['profiles']['windsor'])

if __name__=='__main__':unittest.main()
