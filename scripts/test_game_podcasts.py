import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('podcasts',Path(__file__).with_name('refresh-game-podcasts.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class PublisherChapters(unittest.TestCase):
    def test_youtube_clock(self):
        self.assertEqual(p.chapters('AUS - 3:23\nRSEQ - 25:55\nCanWest - 52:55'),[{'label':'AUS','start':203},{'label':'RSEQ','start':1555},{'label':'CanWest','start':3175}])
    def test_game_chapters(self):
        self.assertEqual(p.chapters('0:00 Introduction\n35:05 - Waterloo @ McMaster\nCarleton @ Laurier - 48:56')[1:], [{'label':'Waterloo @ McMaster','start':2105},{'label':'Carleton @ Laurier','start':2936}])
    def test_exact_team_aliases(self):
        self.assertTrue(p.team('UofT','toronto'));self.assertTrue(p.team("Queen’s",'queens'));self.assertFalse(p.team('Western','windsor'))
    def test_no_inferred_timing(self):
        self.assertEqual(p.chapters('Tom and Zac preview five games in the OUA.'),[])
if __name__=='__main__':unittest.main()
