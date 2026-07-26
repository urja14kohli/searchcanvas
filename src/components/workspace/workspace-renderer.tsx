"use client";

import type { Column, Row, WorkspaceData } from "@/lib/types";
import { CompanyWorkspace } from "@/components/workspace/company-workspace";
import { TableWorkspace } from "@/components/workspace/table-workspace";
import { TimelineWorkspace } from "@/components/workspace/timeline-workspace";
import { KnowledgeWorkspace } from "@/components/workspace/knowledge-workspace";
import { ChartWorkspace } from "@/components/workspace/chart-workspace";

type Props = {
  data: WorkspaceData;
  loading?: boolean;
  progress?: number;
  selectedId?: string | null;
  onSelect?: (row: Row) => void;
  addColumnOptions?: Column[];
  onAddColumn?: (key: string) => void;
};

/** Picks the right layout for whatever the search pipeline produced. */
export function WorkspaceRenderer({
  data,
  loading,
  progress,
  selectedId,
  onSelect,
  addColumnOptions = [],
  onAddColumn,
}: Props) {
  switch (data.type) {
    case "company":
      return <CompanyWorkspace data={data} />;
    case "comparison":
    case "spreadsheet":
      return (
        <TableWorkspace
          data={data}
          loading={loading}
          progress={progress}
          selectedId={selectedId}
          onSelect={onSelect}
          addColumnOptions={addColumnOptions}
          onAddColumn={onAddColumn}
        />
      );
    case "chart":
      return <ChartWorkspace data={data} />;
    case "timeline":
      return <TimelineWorkspace data={data} />;
    case "knowledge":
      return <KnowledgeWorkspace data={data} />;
    default:
      return null;
  }
}
