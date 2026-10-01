import copy, unittest
import national
from ingest import text_play,metrics

class NationalTests(unittest.TestCase):
    def event(self,away,home,status='Final',scores=('0','17'),link='/sports/fball/2026-27/boxscores/20260926_test.xml'):
        return f'''<div class="event-row"><div class="cal-status">{status}</div><div class="list-events-participants"><span class="team-name" title="{away}">{away}</span><div class="team-result">{scores[0]}</div></div><div class="list-events-participants"><span class="team-name" title="{home}"><span class="va">at</span>{home}</span><div class="team-result">{scores[1]}</div></div><a href="{link}">Box Score</a></div>'''
    def test_all_conferences_and_zero_score(self):
        for a,h,conf in [('Waterloo','Guelph','OUA'),('Montréal','Laval','RSEQ'),("Saint Mary's",'Mount Allison','AUS'),('UBC','Alberta','CW')]:
            games,unknown=national.parse_composite(self.event(a,h),'2026-09-26')
            self.assertFalse(unknown);self.assertEqual(games[0]['conference'],conf);self.assertEqual(games[0]['awayScore'],0)
            self.assertTrue(games[0]['boxscore'].startswith('https://en.usports.ca/'))
    def test_status_missing_scores_aliases(self):
        games,_=national.parse_composite(self.event('St. Francis Xavier','Acadia','7:00 PM EDT',('','')),'2026-10-02')
        self.assertEqual(games[0]['away'],'stfx');self.assertIsNone(games[0]['awayScore']);self.assertEqual(games[0]['status'],'scheduled')
        self.assertEqual(national.team('Montréal Carabins')['slug'],'montreal')
        self.assertEqual(national.team('Mt. Allison')['slug'],'mount-allison')
    def test_placeholder_is_retained(self):
        games,unknown=national.parse_composite(self.event('AUS #3','AUS #2'),'2026-11-07')
        self.assertFalse(games);self.assertEqual(unknown[0]['teams'],['AUS #3','AUS #2'])
    def test_presto_possession_and_same_play_rules(self):
        g=national.parse_composite(self.event("Saint Mary's",'Mount Allison'),'2026-09-26')[0][0]
        header='<span class="stats-header">Saint Mary’s</span><span class="stats-header">Mount Allison</span>'
        plays='''<table><tr><th>Saint Mary's at 15:00</th></tr><tr><td>1st and 10 at SMU20</td><td>Runner rush for 15 yards.</td></tr><tr><td>2nd and 10 at SMU20</td><td>Runner rush for 8 yards, PENALTY SMU holding.</td></tr><tr><th>Mount Allison at 12:00</th></tr><tr><td>1st and 10 at MTA20</td><td>QB pass incomplete.</td></tr><tr><td>2nd and 10 at MTA20</td><td>QB sacked for loss of 5 yards.</td></tr></table>'''
        p=national.presto(g,lambda u:header+plays,text_play,metrics)
        self.assertEqual([x['yards'] for x in p['plays']],[15,0,-5]);self.assertEqual(p['away']['stats']['explosives'],1);self.assertEqual(p['home']['stats']['negatives'],2)
        bad=copy.deepcopy(g);bad['home']='acadia';self.assertIsNone(national.presto(bad,lambda u:header+plays,text_play,metrics))
    def test_partial_index_fails_closed(self):
        with self.assertRaises(ValueError):national.discover(lambda u:'composite?d=2026-09-26',lambda fn,rows:[],2026)

if __name__=='__main__':unittest.main()
