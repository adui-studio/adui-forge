import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers.dart';

/// 技能库屏（只读，移动端"查看"域）：列出云端 Skill 库的
/// 名称 / 启停 / 描述，点开查看指令全文。增删改在 Web 端完成。
class SkillsScreen extends ConsumerStatefulWidget {
  const SkillsScreen({super.key});

  @override
  ConsumerState<SkillsScreen> createState() => _SkillsScreenState();
}

class _SkillsScreenState extends ConsumerState<SkillsScreen> {
  Future<List<Map<String, dynamic>>>? _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    setState(() {
      _future = ref.read(apiClientProvider).fetchSkills();
    });
  }

  void _openDetail(Map<String, dynamic> skill) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => _SkillDetailScreen(skill: skill)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('技能库')),
      body: RefreshIndicator(
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
            final skills = snapshot.data ?? const [];
            if (skills.isEmpty) {
              return Center(
                child: Text(
                  '还没有 Skill。\n在 Web 端「Skills」页创建或从市场安装。',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.45)),
                ),
              );
            }
            return ListView(
              padding: const EdgeInsets.all(12),
              children: [
                for (final skill in skills)
                  Card(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      title: Row(
                        children: [
                          Flexible(
                            child: Text(
                              (skill['name'] as String?) ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          if (skill['enabled'] == true)
                            const Text(
                              '启用',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF6CFF00),
                              ),
                            )
                          else
                            Text(
                              '停用',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.white.withValues(alpha: 0.4),
                              ),
                            ),
                        ],
                      ),
                      subtitle: Text(
                        (skill['description'] as String?) ?? '',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12),
                      ),
                      onTap: () => _openDetail(skill),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SkillDetailScreen extends StatelessWidget {
  const _SkillDetailScreen({required this.skill});

  final Map<String, dynamic> skill;

  @override
  Widget build(BuildContext context) {
    final description = (skill['description'] as String?) ?? '';
    final instructions = (skill['instructions'] as String?) ?? '';
    return Scaffold(
      appBar: AppBar(title: Text((skill['name'] as String?) ?? '')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (description.isNotEmpty)
              Text(
                description,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white.withValues(alpha: 0.55),
                ),
              ),
            if (description.isNotEmpty) const SizedBox(height: 12),
            SelectableText(
              instructions,
              style: const TextStyle(height: 1.5, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}
