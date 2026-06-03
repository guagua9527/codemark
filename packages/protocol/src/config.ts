export interface ProjectConfig {
  framework: 'vue' | 'react' | 'other'
  aiProvider: 'deepseek' | 'openai' | 'claude'
  aiModel: string
  autoFixEnabled: boolean
  autoFixRequiresApproval: boolean
}
