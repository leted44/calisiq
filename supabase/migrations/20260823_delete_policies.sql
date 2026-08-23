create policy "scores: delete own" on scores for delete using (
  exists (select 1 from sessions where sessions.id = scores.session_id and sessions.user_id = auth.uid())
);

create policy "recommendations: delete own" on recommendations for delete using (
  exists (select 1 from sessions where sessions.id = recommendations.session_id and sessions.user_id = auth.uid())
);

create policy "videos: delete own" on storage.objects for delete
  using (bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text);
