"""Download EPL match data from Football-Data.co.uk for 10 seasons."""
import os
import time
import requests

SEASONS = {
    '2014/2015': '1415', '2015/2016': '1516', '2016/2017': '1617',
    '2017/2018': '1718', '2018/2019': '1819', '2019/2020': '1920',
    '2020/2021': '2021', '2021/2022': '2122', '2022/2023': '2223',
    '2023/2024': '2324'
}
BASE_URL = "https://www.football-data.co.uk/mmz4281/{code}/E0.csv"
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
os.makedirs(OUT_DIR, exist_ok=True)

for label, code in SEASONS.items():
    url = BASE_URL.format(code=code)
    out_path = os.path.join(OUT_DIR, f"football_data_{code}.csv")
    print(f"Downloading {label} ({code})... ", end="", flush=True)
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        with open(out_path, 'wb') as f:
            f.write(resp.content)
        # Count rows (subtract header)
        n_rows = resp.text.count('\n') - 1
        print(f"OK ({n_rows} rows)")
    except Exception as e:
        print(f"FAILED: {e}")
    time.sleep(1)

print("\nDone. Files in", os.path.abspath(OUT_DIR))
