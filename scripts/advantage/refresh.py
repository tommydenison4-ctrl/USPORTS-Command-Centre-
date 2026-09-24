"""U SPORTS current-season refresh: never read older-season profiles or coefficients."""
import json,subprocess,sys
from pathlib import Path
import train
ROOT=Path(__file__).resolve().parents[2]
target=ROOT/'data/advantage-usports.json'
subprocess.run(['node',str(Path(__file__).with_name('snapshots.cjs')),'freeze'],check=True)
old=json.loads(target.read_text())
subprocess.run([sys.executable,str(Path(__file__).with_name('ingest.py')),'USPORTS'],check=True)
source=json.loads(Path(__file__).with_name('usports-history.json').read_text())
history=train.clean(source['history'],'USPORTS')
if len(history)<old['coverage']['completedGames']*.95:raise RuntimeError('2026 source coverage regressed; previous 2026-only data retained')
train.train('USPORTS')
new=json.loads(Path(__file__).with_name('usports-model.json').read_text())
new['frozen']={k:v for k,v in old.get('frozen',{}).items() if '2026' in v.get('modelVersion','')}
target.write_text(json.dumps(new))
(ROOT/'data/holdout-usports.json').write_text(Path(__file__).with_name('usports-holdout.json').read_text())
subprocess.run(['node',str(Path(__file__).with_name('snapshots.cjs')),'build'],check=True)

import players
players.build()

import season_watch
season_watch.build()
subprocess.run(['node',str(Path(__file__).with_name('check-season.cjs'))],check=True)
