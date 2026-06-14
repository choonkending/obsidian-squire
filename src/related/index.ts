export type { NoteDoc, RelatedResult, RelatedWeights } from "./types";
export { default as LexicalEngine, DEFAULT_WEIGHTS } from "./LexicalEngine";
export { RelatedNotesService } from "./RelatedNotesService";
export { RelatedNotesView, RELATED_NOTES_VIEW_TYPE } from "./RelatedNotesView";
export { RelatedNotesModal } from "./RelatedNotesModal";
export { buildNoteDoc, collectCandidates } from "./vault";
