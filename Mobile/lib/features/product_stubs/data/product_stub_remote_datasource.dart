import 'package:dio/dio.dart';
import 'package:rankup_education/core/api/api_exception_mapper.dart';
import 'package:rankup_education/core/api/api_response.dart';
import 'package:rankup_education/core/errors/app_exception.dart';
import 'package:rankup_education/features/product_stubs/data/product_stub_models.dart';

class ProductStubRemoteDataSource {
  const ProductStubRemoteDataSource(this._dio);

  final Dio _dio;

  Future<List<NotificationItem>> getNotifications() async {
    final data = await _getMap('/notifications');
    return _mapItems(data['items'], NotificationItem.fromJson);
  }

  Future<List<AttendanceRecord>> getMyAttendance() async {
    final data = await _getMap('/attendance/me');
    return _mapItems(data['items'], AttendanceRecord.fromJson);
  }

  Future<List<MessageThread>> getMessageThreads() async {
    final data = await _getMap('/messaging/threads');
    return _mapItems(data['items'], MessageThread.fromJson);
  }

  Future<RewardSummary> getMyRewards() async {
    final data = await _getMap('/rewards/me');
    return RewardSummary.fromJson(data);
  }

  Future<List<CompetitionItem>> getCompetitions() async {
    final data = await _getMap('/competitions');
    return _mapItems(data['items'], CompetitionItem.fromJson);
  }

  Future<List<WorksheetItem>> getWorksheets() async {
    final data = await _getMap('/worksheets');
    return _mapItems(data['items'], WorksheetItem.fromJson);
  }

  Future<Map<String, dynamic>> _getMap(String path) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(path);
      final json = response.data;
      if (json == null) {
        throw const UnknownAppException('Empty API response.');
      }
      final api = ApiResponse<Map<String, dynamic>>.fromJson(
        json,
        (data) => (data as Map<String, dynamic>?) ?? <String, dynamic>{},
      );
      if (!api.success) {
        throw UnknownAppException(
          api.message.isEmpty ? 'Request failed.' : api.message,
        );
      }
      return api.data;
    } on DioException catch (error) {
      throw mapDioException(error);
    }
  }

  List<T> _mapItems<T>(
    Object? raw,
    T Function(Map<String, dynamic> json) mapper,
  ) {
    final list = raw as List<dynamic>? ?? const [];
    return list
        .whereType<Map<String, dynamic>>()
        .map(mapper)
        .toList(growable: false);
  }
}
