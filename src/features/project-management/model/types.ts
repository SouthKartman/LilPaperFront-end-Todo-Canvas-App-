import type { RootState } from '@shared/lib/state/store';

e

type ProjectThunkConfig = {
  state: RootState;
  rejectValue: string;
};

type RenameProjectPayload = { projectId: string; name: string };
type DeletePagePayload = { projectId: string; pageId: string };
type RenamePagePayload = { pageId: string; name: string };
