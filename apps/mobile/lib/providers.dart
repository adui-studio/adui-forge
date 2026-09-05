import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';

/// baseUrl 运行时可变（设置项）；默认指向本机开发 API。
/// Android 模拟器访问宿主机用 10.0.2.2。
final baseUrlProvider =
    NotifierProvider<BaseUrlNotifier, String>(BaseUrlNotifier.new);

class BaseUrlNotifier extends Notifier<String> {
  @override
  String build() => 'http://10.0.2.2:3000';

  void set(String value) => state = value;
}

final apiClientProvider = Provider<ForgeApiClient>((ref) {
  return ForgeApiClient(baseUrl: ref.watch(baseUrlProvider));
});

final runsProvider = FutureProvider.autoDispose<List<RunRecord>>((ref) async {
  return ref.watch(apiClientProvider).listRuns();
});

final pendingApprovalsProvider =
    FutureProvider.autoDispose<List<PendingApproval>>((ref) async {
  return ref.watch(apiClientProvider).listPendingApprovals();
});

final runDetailProvider =
    FutureProvider.autoDispose.family<RunRecord, String>((ref, id) async {
  return ref.watch(apiClientProvider).getRun(id);
});
