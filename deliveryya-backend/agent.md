# Agent Notes

Read this file first before making changes.

## Workflow
1. Inspect only the files directly related to the requested feature.
2. Prefer the existing controller/service/specification/DTO patterns in this project.
3. Keep changes minimal and avoid unrelated refactors.
4. For paginated search endpoints, update the request DTO, spec, service, controller, and docs together.
5. Default optional search toggles to `false` unless the user explicitly enables them.

## Project Conventions
- Paginated endpoints use `POST` with a request DTO containing `pageNumber`, `countPerPage`, `totalCount`, `totalPages`, and `items`.
- Search logic is implemented with Spring Data JPA `Specification` classes.
- Responses should stay inside `ResponseDto` unless the existing controller already returns a raw DTO.
- Update the relevant `docs/api/*.md` file for any new endpoint or request field.

