import tempfile,time,hashlib,unittest
from pathlib import Path
from unittest.mock import patch
import ingest
class PostgameCacheTests(unittest.TestCase):
    def setUp(self):
        # Keep fixture dates recent regardless of the runner's calendar date.
        asof = patch.object(ingest, 'ASOF', '2026-10-18')
        asof.start()
        self.addCleanup(asof.stop)
    def test_recent_composite_is_refetched_after_one_minute(self):
        url='https://en.usports.ca/sports/fball/composite?d=2026-10-17'
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self):return b'updated official final'
        with tempfile.TemporaryDirectory() as folder:
            cache=Path(folder);p=cache/(hashlib.sha256(url.encode()).hexdigest()+'.txt');p.write_text('cached pregame')
            with patch.object(ingest,'CACHE',cache),patch.object(ingest.time,'time',return_value=p.stat().st_mtime+61),patch.object(ingest,'urlopen',return_value=Response()) as network:
                self.assertEqual(ingest.fetch(url),'updated official final');network.assert_called_once()
    def test_recent_composite_reuses_short_cache(self):
        url='https://en.usports.ca/sports/fball/composite?d=2026-10-17'
        with tempfile.TemporaryDirectory() as folder:
            cache=Path(folder);p=cache/(hashlib.sha256(url.encode()).hexdigest()+'.txt');p.write_text('verified final')
            with patch.object(ingest,'CACHE',cache),patch.object(ingest.time,'time',return_value=p.stat().st_mtime+30),patch.object(ingest,'urlopen') as network:
                self.assertEqual(ingest.fetch(url),'verified final');network.assert_not_called()
if __name__=='__main__':unittest.main()
