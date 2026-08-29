import { Injectable } from "@nestjs/common";

export interface ArtifactRecord {
  id: string;
  runId: string;
  name: string;
  type: string;
  content: string;
  createdAt: string;
}

/** Run 产物登记（REQUIREMENTS.md §55）：MVP 阶段内存存储。 */
@Injectable()
export class ArtifactService {
  readonly #artifacts: ArtifactRecord[] = [];

  register(input: { runId: string; name: string; type: string; content: string }): ArtifactRecord {
    const record: ArtifactRecord = {
      id: `artifact_${globalThis.crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.#artifacts.unshift(record);
    return record;
  }

  listByRun(runId: string): ArtifactRecord[] {
    return this.#artifacts.filter((artifact) => artifact.runId === runId);
  }
}
