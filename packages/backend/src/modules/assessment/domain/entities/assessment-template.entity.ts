import { ItemCategory } from '../value-objects/assessment-enums';

export interface TemplateItem {
  id: string;
  code: string;
  label: string;
  category: ItemCategory;
  required: boolean;
  sortOrder: number;
}

export interface AssessmentTemplateProps {
  id: string;
  key: string;
  version: number;
  name: string;
  description: string | null;
  isActive: boolean;
  items: TemplateItem[];
  createdAt: Date;
}

export class AssessmentTemplate {
  private constructor(private props: AssessmentTemplateProps) {}

  static hydrate(props: AssessmentTemplateProps): AssessmentTemplate {
    return new AssessmentTemplate(props);
  }

  get id(): string { return this.props.id; }
  get key(): string { return this.props.key; }
  get version(): number { return this.props.version; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get isActive(): boolean { return this.props.isActive; }
  get items(): TemplateItem[] { return [...this.props.items]; }
  get createdAt(): Date { return this.props.createdAt; }

  findItem(code: string): TemplateItem | undefined {
    return this.props.items.find((i) => i.code === code);
  }

  requiredCodes(): string[] {
    return this.props.items.filter((i) => i.required).map((i) => i.code);
  }
}
