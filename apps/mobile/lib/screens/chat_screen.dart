import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api_client.dart';
import '../providers.dart';

/// 消息气泡的极简模型。
class _ChatMessage {
  _ChatMessage.user(this.text)
      : role = 'user',
        state = _MessageState.done,
        error = null;

  _ChatMessage.assistant(this.text, this.state, {this.error})
      : role = 'assistant';

  final String role;
  String text;
  _MessageState state;
  final String? error;
}

enum _MessageState { pending, done, failed }

/// Chat 屏：每条消息一个独立 Run；发送后轮询至终态并展示模型输出。
/// 会话经 conversations API 持久化——与 Web 端共享同一份会话数据。
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final List<_ChatMessage> _messages = [];
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();
  String? _conversationId;
  bool _busy = false;

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _busy) return;
    setState(() {
      _busy = true;
      _messages.add(_ChatMessage.user(text));
      _messages.add(_ChatMessage.assistant('', _MessageState.pending));
      _input.clear();
    });
    _scrollToBottom();

    try {
      final client = ref.read(apiClientProvider);
      // 会话持久化：首条消息时创建会话（标题由后端取前 30 字）
      _conversationId ??= (await client.createConversation('forge-dev')).id;
      await client.appendConversationMessage(
          _conversationId!, ChatMessageRecord(role: 'user', text: text));
      final run = await client.createRun(text);
      // 轮询至终态（2s 间隔，最多 5 分钟）
      RunRecord current = run;
      for (var attempt = 0; attempt < 150; attempt++) {
        await Future<void>.delayed(const Duration(seconds: 2));
        current = await client.getRun(run.id);
        if (current.isTerminal) break;
      }
      if (!mounted) return;
      final assistantText = current.status == 'completed'
          ? (current.output.isEmpty ? '（无文本输出）' : current.output)
          : '';
      // 回复落库（runId 关联派生 Run）
      await client.appendConversationMessage(
          _conversationId!,
          ChatMessageRecord(
            role: 'assistant',
            text: assistantText,
            runId: run.id,
            status: current.status,
            error: current.error,
          ));
      if (!mounted) return;
      setState(() {
        _messages.removeLast();
        if (current.status == 'completed') {
          _messages.add(_ChatMessage.assistant(assistantText, _MessageState.done));
        } else {
          _messages.add(_ChatMessage.assistant(
            current.status == 'cancelled' ? '已取消。' : '',
            _MessageState.failed,
            error: current.error ?? 'Run ${current.status}',
          ));
        }
        _busy = false;
      });
      _scrollToBottom();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _messages.removeLast();
        _messages.add(_ChatMessage.assistant('', _MessageState.failed,
            error: error.toString()));
        _busy = false;
      });
      _scrollToBottom();
    }
  }

  /// 历史会话：底部弹层列出最近会话，选择后加载消息。
  Future<void> _showHistorySheet() async {
    final client = ref.read(apiClientProvider);
    final list = await client.listConversations();
    if (!mounted || list.isEmpty) return;
    final selected = await showModalBottomSheet<String>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: ListView(
          children: [
            for (final conversation in list.take(30))
              ListTile(
                leading: const Icon(Icons.forum_outlined),
                title: Text(
                    conversation.title.isEmpty ? '（未命名会话）' : conversation.title),
                subtitle: Text('${conversation.messageCount} 条消息'),
                onTap: () => Navigator.of(sheetContext).pop(conversation.id),
              ),
          ],
        ),
      ),
    );
    if (selected == null || !mounted) return;
    final detail = await client.fetchConversation(selected);
    if (!mounted) return;
    setState(() {
      _conversationId = detail.id;
      _busy = false;
      _messages
        ..clear()
        ..addAll(detail.messages.map((message) => message.role == 'user'
            ? _ChatMessage.user(message.text)
            : _ChatMessage.assistant(
                message.text,
                message.status == 'failed'
                    ? _MessageState.failed
                    : _MessageState.done,
                error: message.error,
              )));
    });
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat'),
        actions: [
          IconButton(
            tooltip: '历史会话',
            icon: const Icon(Icons.history),
            onPressed: _busy ? null : _showHistorySheet,
          ),
          IconButton(
            tooltip: 'Runs',
            icon: const Icon(Icons.list_alt),
            onPressed: () => context.push('/runs'),
          ),
          IconButton(
            tooltip: '审批',
            icon: const Icon(Icons.verified_user_outlined),
            onPressed: () => context.push('/approvals'),
          ),
          IconButton(
            tooltip: '设置',
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.push('/settings'),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? Center(
                    child: Text(
                      '向 Agent 提问或下达指令。\n每条消息作为一个独立 Run 执行，会话自动保存。',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.45)),
                    ),
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(12),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) => _bubble(_messages[index]),
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      enabled: !_busy,
                      maxLines: null,
                      minLines: 1,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: '输入消息…',
                        filled: true,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: _busy ? null : _send,
                    icon: _busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _bubble(_ChatMessage message) {
    final isUser = message.role == 'user';
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.82,
        ),
        decoration: BoxDecoration(
          color: isUser
              ? const Color(0xFF3A2C4A)
              : Colors.white.withValues(alpha: 0.05),
          border: Border.all(
            color: isUser
                ? const Color(0xFFB79AEC)
                : Colors.white.withValues(alpha: 0.1),
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: message.state == _MessageState.pending
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SelectableText(
                    message.text,
                    style: const TextStyle(height: 1.45),
                  ),
                  if (message.error != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        '执行失败：${message.error}',
                        style: const TextStyle(
                            color: Color(0xFFF87171), fontSize: 12),
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}
