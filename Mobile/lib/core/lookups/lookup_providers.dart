import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rankup_education/core/api/api_client.dart';
import 'package:rankup_education/core/lookups/lookup_item.dart';
import 'package:rankup_education/core/lookups/lookup_remote_datasource.dart';

final lookupRemoteDataSourceProvider = Provider<LookupRemoteDataSource>((ref) {
  return LookupRemoteDataSource(ref.watch(dioProvider));
});

/// Loads lookup options for [type], optionally filtered by [parentId].
final lookupsProvider =
    FutureProvider.family<List<LookupItem>, ({String type, int? parentId})>((
  ref,
  args,
) {
  return ref.watch(lookupRemoteDataSourceProvider).list(
        type: args.type,
        parentId: args.parentId,
      );
});
