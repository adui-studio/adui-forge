import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers.dart';

/// 登录 / 注册屏：令牌经 ForgeApiClient 存入安全存储。
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) context.go('/runs');
    } catch (error) {
      setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  bool get _valid =>
      _username.text.length >= 3 && _password.text.length >= 8 && !_busy;

  @override
  Widget build(BuildContext context) {
    final client = ref.read(apiClientProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('登录 ADui Forge')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _username,
            decoration: const InputDecoration(labelText: '用户名'),
            onChanged: (_) => setState(() {}),
          ),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(labelText: '密码（至少 8 位）'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _valid
                ? () => _submit(() => client.login(_username.text, _password.text))
                : null,
            child: const Text('登录'),
          ),
          const SizedBox(height: 8),
          FilledButton.tonal(
            onPressed: _valid
                ? () => _submit(() => client.register(_username.text, _password.text))
                : null,
            child: const Text('注册并登录'),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
        ],
      ),
    );
  }
}
