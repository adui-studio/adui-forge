import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';

/// 对比统计屏（只读）：跨批次按 Agent / 按模型聚合——
/// 参与批次数、完成/失败、平均耗时与最快胜出次数。数据来自 /comparisons/stats*。
class CompareStatsScreen extends ConsumerStatefulWidget {
  const CompareStatsScreen({super.key});

  @override
  ConsumerState<CompareStatsScreen> createState() => _CompareStatsScreenState();
}

class _CompareStatsScreenState extends ConsumerState<CompareStatsScreen> {
  bool _byModel = false;
  Future<List<Map<String, dynamic>>>? _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    final client = ref.read(apiClientProvider);
    setState(() {
      _future = _byModel
          ? client.fetchComparisonStatsByModel()
          : client.fetchComparisonStats();
    });
  }

  String _nameOf(Map<String, dynamic> row) =>
      (row[_byModel ? 'model' : 'agentName'] as String?) ?? '';

  String _durationOf(Map<String, dynamic> row) {
    final avg = row['avgDurationMs'] as num?;
    return avg == null ? '—' : '${(avg / 1000).toStringAsFixed(1)}s';
  }

  String _tokensOf(Map<String, dynamic> row) {
    final avg = row['avgTokens'] as num?;
    return avg == null ? '—' : avg.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('对比统计')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
            child: SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: false, label: Text('按 Agent')),
                ButtonSegment(value: true, label: Text('按模型')),
              ],
              selected: {_byModel},
              onSelectionChanged: (selection) {
                if (selection.first != _byModel) {
                  _byModel = selection.first;
                  _reload();
                }
              },
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => _reload(),
              child: FutureBuilder<List<Map<String, dynamic>>>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return Center(child: Text('加载失败：${snapshot.error}'));
                  }
                  final rows = snapshot.data ?? const [];
                  if (rows.isEmpty) {
                    return Center(
                      child: Text(
                        '暂无统计数据。\n在「对比」页发起几次对比后可见。',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.45),
                        ),
                      ),
                    );
                  }
                  return ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      for (final row in rows)
                        Card(
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _nameOf(row),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      '最快 x${row['fastestWins'] ?? 0}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF6CFF00),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '批次 ${row['batches'] ?? 0}'
                                  ' · 完成 ${row['completed'] ?? 0}'
                                  ' · 失败 ${row['failed'] ?? 0}'
                                  ' · 平均 ${_durationOf(row)}'
                                  ' · 平均 ${_tokensOf(row)} tok',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.white54,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}
