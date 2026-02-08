"""Static fallback visualizations for the paper."""
import os
import json
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mtick

PROJ_DIR = os.path.join(os.path.dirname(__file__), '..')
PBI_DIR = os.path.join(PROJ_DIR, 'data', 'powerbi')
OUT_DIR = os.path.join(PROJ_DIR, 'data', 'output')
FIG_DIR = os.path.join(PROJ_DIR, 'docs', 'figures')
os.makedirs(FIG_DIR, exist_ok=True)

fact = pd.read_csv(os.path.join(PBI_DIR, 'fact_plus2_events.csv'))
summary_bucket = pd.read_csv(os.path.join(PBI_DIR, 'summary_by_bucket.csv')).sort_values('bucket_order')
summary_season = pd.read_csv(os.path.join(PBI_DIR, 'summary_by_season.csv')).sort_values('sort_order')
summary_team = pd.read_csv(os.path.join(PBI_DIR, 'summary_by_team.csv'))

with open(os.path.join(OUT_DIR, 'descriptive_stats.json'), 'r') as f:
    desc = json.load(f)

COLORS = {'W': '#2ecc71', 'D': '#f39c12', 'L': '#e74c3c'}
plt.rcParams.update({'font.size': 11, 'figure.dpi': 300, 'savefig.dpi': 300, 'savefig.bbox': 'tight'})

# =========================================
# Fig 1: Overall W/D/L bar chart with CIs
# =========================================
print("Fig 1: Overall W/D/L...")
fig, ax = plt.subplots(figsize=(8, 5))
overall = desc['overall']
cats = ['Win', 'Draw', 'Loss']
vals = [overall['win_rate'], overall['draw_rate'], overall['loss_rate']]
ci_lows = [overall['win_ci_low'], overall['draw_ci_low'], overall['loss_ci_low']]
ci_highs = [overall['win_ci_high'], overall['draw_ci_high'], overall['loss_ci_high']]
errs = [[v - l for v, l in zip(vals, ci_lows)], [h - v for v, h in zip(vals, ci_highs)]]
colors = [COLORS['W'], COLORS['D'], COLORS['L']]
bars = ax.bar(cats, vals, color=colors, edgecolor='white', linewidth=1.5, yerr=errs, capsize=8, error_kw={'linewidth': 2})
for bar, val in zip(bars, vals):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02, f'{val:.1%}',
            ha='center', va='bottom', fontweight='bold', fontsize=14)
ax.set_ylabel('Proportion of +2 Lead Events')
ax.set_title(f'Outcome After Taking a Two-Goal Lead (n={overall["n"]:,})', fontsize=13, fontweight='bold')
ax.set_ylim(0, 1.05)
ax.yaxis.set_major_formatter(mtick.PercentFormatter(1.0))
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.savefig(os.path.join(FIG_DIR, 'fig1_overall_wdl.png'))
plt.close()

# =========================================
# Fig 2: P(W) by minute bucket with threshold lines
# =========================================
print("Fig 2: Win rate by minute bucket...")
fig, ax = plt.subplots(figsize=(10, 6))
x = range(len(summary_bucket))
labels = summary_bucket['bucket_key'].tolist()
wr = summary_bucket['win_rate'].tolist()
ci_lo = summary_bucket['win_ci_low'].tolist()
ci_hi = summary_bucket['win_ci_high'].tolist()

ax.plot(x, wr, 'o-', color='#2c3e50', linewidth=2.5, markersize=10, zorder=5)
ax.fill_between(x, ci_lo, ci_hi, alpha=0.2, color='#3498db')
ax.axhline(y=0.90, color='#e74c3c', linestyle='--', linewidth=1.5, label='90% threshold')
ax.axhline(y=0.95, color='#e67e22', linestyle=':', linewidth=1.5, label='95% threshold')

for i, (xi, yi, n) in enumerate(zip(x, wr, summary_bucket['n'].tolist())):
    ax.annotate(f'{yi:.1%}\n(n={n})', (xi, yi), textcoords="offset points",
                xytext=(0, 15), ha='center', fontsize=9)

ax.set_xticks(x)
ax.set_xticklabels(labels)
ax.set_xlabel('Minute Bucket When +2 Lead Was Reached')
ax.set_ylabel('Win Probability')
ax.set_title('Win Probability by Minute of +2 Lead', fontsize=13, fontweight='bold')
ax.set_ylim(0.75, 1.02)
ax.yaxis.set_major_formatter(mtick.PercentFormatter(1.0))
ax.legend(loc='lower right')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.savefig(os.path.join(FIG_DIR, 'fig2_win_rate_by_minute.png'))
plt.close()

# =========================================
# Fig 3: Heatmap - bucket x outcome proportions
# =========================================
print("Fig 3: Bucket heatmap...")
fig, ax = plt.subplots(figsize=(8, 5))
heatmap_data = summary_bucket[['bucket_key', 'win_rate', 'draw_rate', 'loss_rate']].set_index('bucket_key')
heatmap_data.columns = ['Win', 'Draw', 'Loss']
im = ax.imshow(heatmap_data.values.T, cmap='RdYlGn', aspect='auto', vmin=0, vmax=1)
ax.set_xticks(range(len(heatmap_data)))
ax.set_xticklabels(heatmap_data.index, rotation=0)
ax.set_yticks(range(3))
ax.set_yticklabels(['Win', 'Draw', 'Loss'])
for i in range(3):
    for j in range(len(heatmap_data)):
        val = heatmap_data.values[j, i]
        ax.text(j, i, f'{val:.1%}', ha='center', va='center', fontsize=10,
                color='white' if val > 0.5 or val < 0.05 else 'black', fontweight='bold')
ax.set_title('Outcome Proportions by Minute Bucket', fontsize=13, fontweight='bold')
ax.set_xlabel('Minute Bucket')
plt.colorbar(im, ax=ax, label='Proportion', shrink=0.8)
plt.savefig(os.path.join(FIG_DIR, 'fig3_bucket_heatmap.png'))
plt.close()

# =========================================
# Fig 4: Points dropped by season
# =========================================
print("Fig 4: Points dropped by season...")
fig, ax = plt.subplots(figsize=(10, 5))
ax.bar(summary_season['season_key'], summary_season['points_dropped'], color='#e74c3c', edgecolor='white')
for i, (sk, pd_val) in enumerate(zip(summary_season['season_key'], summary_season['points_dropped'])):
    ax.text(i, pd_val + 1, str(pd_val), ha='center', va='bottom', fontsize=9)
ax.set_xlabel('Season')
ax.set_ylabel('Total Points Dropped from +2 Leads')
ax.set_title('Points Dropped from Two-Goal Leads by Season', fontsize=13, fontweight='bold')
ax.tick_params(axis='x', rotation=45)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.savefig(os.path.join(FIG_DIR, 'fig4_points_dropped_season.png'))
plt.close()

# =========================================
# Fig 5: Strength vs win rate scatter
# =========================================
print("Fig 5: Strength scatter...")
valid = fact.dropna(subset=['leader_implied_prob'])
if len(valid) > 100:
    fig, ax = plt.subplots(figsize=(8, 6))
    # Bin implied prob for cleaner viz
    valid['prob_bin'] = pd.cut(valid['leader_implied_prob'], bins=10)
    binned = valid.groupby('prob_bin', observed=True).agg(
        mean_prob=('leader_implied_prob', 'mean'),
        win_rate=('is_win', 'mean'),
        n=('is_win', 'count'),
    ).reset_index()
    binned = binned[binned['n'] >= 10]
    ax.scatter(binned['mean_prob'], binned['win_rate'], s=binned['n']*3, alpha=0.7, color='#3498db', edgecolors='#2c3e50')
    ax.set_xlabel('Pre-Match Implied Win Probability (Leader)')
    ax.set_ylabel('Actual Win Rate After +2 Lead')
    ax.set_title('Pre-Match Strength vs. +2 Lead Win Rate', fontsize=13, fontweight='bold')
    ax.axhline(y=0.90, color='#e74c3c', linestyle='--', alpha=0.5)
    ax.yaxis.set_major_formatter(mtick.PercentFormatter(1.0))
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    plt.savefig(os.path.join(FIG_DIR, 'fig5_strength_scatter.png'))
    plt.close()
else:
    print("  Skipped (insufficient odds data)")

# =========================================
# Fig 6: +2 events histogram by minute
# =========================================
print("Fig 6: Events by minute...")
fig, ax = plt.subplots(figsize=(10, 5))
minutes = fact['minute_reached_plus2']
ax.hist(minutes, bins=range(0, 101, 5), color='#3498db', edgecolor='white', alpha=0.8)
ax.set_xlabel('Minute When +2 Lead Was Reached')
ax.set_ylabel('Number of Events')
ax.set_title('Distribution of +2 Lead Events by Minute', fontsize=13, fontweight='bold')
ax.axvline(x=45, color='gray', linestyle='--', alpha=0.5, label='Half-time')
ax.legend()
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.savefig(os.path.join(FIG_DIR, 'fig6_events_by_minute.png'))
plt.close()

# =========================================
# Fig 7: Top/bottom 5 teams by +2 win rate
# =========================================
print("Fig 7: Team comparison...")
qualified = summary_team[summary_team['n_as_leader'] >= 20].copy()
if len(qualified) >= 10:
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    top5 = qualified.nlargest(5, 'win_rate')
    bot5 = qualified.nsmallest(5, 'win_rate')

    ax1.barh(top5['team_key'], top5['win_rate'], color=COLORS['W'], edgecolor='white')
    for i, (_, row) in enumerate(top5.iterrows()):
        ax1.text(row['win_rate'] + 0.005, i, f'{row["win_rate"]:.1%} (n={row["n_as_leader"]})', va='center', fontsize=9)
    ax1.set_xlim(0.85, 1.02)
    ax1.xaxis.set_major_formatter(mtick.PercentFormatter(1.0))
    ax1.set_title('Highest +2 Lead Win Rate', fontweight='bold')
    ax1.invert_yaxis()
    ax1.spines['top'].set_visible(False)
    ax1.spines['right'].set_visible(False)

    ax2.barh(bot5['team_key'], bot5['win_rate'], color=COLORS['L'], edgecolor='white')
    for i, (_, row) in enumerate(bot5.iterrows()):
        ax2.text(row['win_rate'] + 0.005, i, f'{row["win_rate"]:.1%} (n={row["n_as_leader"]})', va='center', fontsize=9)
    ax2.set_xlim(0.75, 1.02)
    ax2.xaxis.set_major_formatter(mtick.PercentFormatter(1.0))
    ax2.set_title('Lowest +2 Lead Win Rate', fontweight='bold')
    ax2.invert_yaxis()
    ax2.spines['top'].set_visible(False)
    ax2.spines['right'].set_visible(False)

    plt.suptitle('Team Comparison: Win Rate After Taking a Two-Goal Lead (min 20 events)', fontsize=13, fontweight='bold')
    plt.tight_layout()
    plt.savefig(os.path.join(FIG_DIR, 'fig7_team_comparison.png'))
    plt.close()
else:
    print("  Skipped (insufficient qualified teams)")

print(f"\nAll figures saved to {os.path.abspath(FIG_DIR)}")
