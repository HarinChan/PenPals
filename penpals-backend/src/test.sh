curl -X POST https://webexapis.com/v1/meetings \
--header 'Authorization: Bearer ZTE1NTdlYTAtZjkyMy00Y2ViLTk5ODctYzk5MzkyNGRiNDc5YTAyYTdmOGUtY2E0_P0A1_bdd2aed2-da17-481d-bd6f-b43037ee90b7' \
--header 'Content-Type: application/json' \
--data '{
  "title": "LLRBT Logic Review",
  "start": "2026-01-20T15:00:00Z",
  "end": "2026-01-20T16:00:00Z"
}'

curl -X GET https://webexapis.com/v1/people/me \
--header 'Authorization: Bearer ZTE1NTdlYTAtZjkyMy00Y2ViLTk5ODctYzk5MzkyNGRiNDc5YTAyYTdmOGUtY2E0_P0A1_bdd2aed2-da17-481d-bd6f-b43037ee90b7'