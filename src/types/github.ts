export interface GithubPayload {
  ref: string
  before?: string
  after?: string
  created?: boolean
  deleted?: boolean
  forced?: boolean
  base_ref?: string
  head_commit?: GithubCommit
  commits?: GithubCommit[]
  repository: GithubRepository
  pusher?: GithubCommitter
  sender?: GithubUser
  compare?: string
  action?: string
  changes?: {
    default_branch?: {
      from?: string
    }
  }
  pull_request?: GithubPullRequest
  forkee?: GithubRepository
  issue?: GithubIssue
  comment?: GithubIssueComment
  release?: GithubRelease
  workflow_run?: GithubWorkflowRun
  workflow_job?: GithubWorkflowJob
  review?: GithubPullRequestReview
  review_comment?: GithubPullRequestReviewComment
  commit_comment?: GithubCommitComment
  check_suite?: GithubCheckSuite
  check_run?: GithubCheckRun
  discussion?: GithubDiscussion
  discussion_comment?: GithubDiscussionComment
  package?: GithubPackage
  deployment?: GithubDeployment
  deployment_status?: GithubDeploymentStatus
  milestone?: GithubMilestone
  project?: GithubProject
  project_card?: GithubProjectCard
  project_column?: GithubProjectColumn
  security_advisory?: GithubSecurityAdvisory
  sponsorship?: GithubSponsorship
  team?: GithubTeam
  label?: GithubLabel
  member?: GithubMember
  ref_type?: string
}

export interface GithubUser {
  name: string
  email: string
  login: string
  id: number
  avatar_url: number
  type: string
  user_view_type: string
  html_url?: string
}

export interface GithubCommitter {
  username?: string
  email: string
  name: string
}

export interface GithubCommit {
  id: string
  tree_id: string
  distinct: boolean
  message: string
  timestamp: string
  url: string
  author: GithubCommitter
  committer: GithubCommitter
  added: string[]
  removed: string[]
}


export interface GithubRepository {
  owner: GithubUser
  name: string
  full_name: string
  private: boolean
  description: string
  fork: boolean
  url: string
  html_url: string
  size: number
  language?: string
  master_branch?: string
  default_branch?: string
}

export interface GithubPullRequest {
  url: string
  id: number
  html_url: string
  diff_url: string
  patch_url: string
  number: number
  state: string
  title: string
  body: string
  created_at: string
  user: GithubUser
  head: {
    label: string
    ref: string
    sha: string
    user: GithubUser
  }
  assignees: GithubUser[]
  requested_reviewers: GithubUser[]
  requested_teams: GithubTeam[]
  labels: GithubLabel[]
  milestone: GithubMilestone
  draft: boolean
  merged: boolean
  mergeable: boolean
  rebaseable: boolean
  repo: GithubRepository
}

export interface GithubTeam {
  id: number
  name: string
  slug: string
}

export interface GithubLabel {
  id: number
  name: string
  description: string
  color: string
  default: boolean
  url: string
}

export interface GithubMilestone {
  id: number
  number: number
  title: string
  description: string
  state: string
  created_at: string
  updated_at: string
}

export interface GithubIssue {
  html_url: string
  id: number
  number: number
  title: string
  body: string
  created_at: string
  updated_at: string
  user: GithubUser
  labels: GithubLabel[]
  state: string
  assignees: GithubUser[]
  comments: number
  closed_at: string
  pull_request: GithubPullRequest
  repository: GithubRepository
}

export interface GithubIssueComment {
  url: string
  id: number
  node_id: string
  html_url: string
  body: string
  created_at: string
  updated_at: string
  user: GithubUser
}

export interface GithubRelease {
  id:  number
  tag_name: string
  name: string
  body: string
  created_at: string
  updated_at: string
  html_url: string
  assets: GithubReleaseAsset[]
}

export interface GithubReleaseAsset {
  id: number
  name: string
  url: string
  browser_download_url: string
  content_type: string
  size: number
}

export interface GithubWorkflowRun {
  id: number
  name: string
  node_id: string
  head_branch: string
  head_sha: string
  run_number: number
  event: string
  status: string
  conclusion: string
  workflow_id: number
  url: string
  html_url: string
  pull_requests: any[]
  created_at: string
  updated_at: string
  actor: GithubUser
  run_attempt: number
  referenced_workflows: any[]
  triggering_actor: GithubUser
  jobs_url: string
  logs_url: string
  check_suite_url: string
  artifacts_url: string
  cancel_url: string
  rerun_url: string
  previous_attempt_url: string
  workflow_url: string
  head_commit: GithubCommit
  repository: GithubRepository
  head_repository: GithubRepository
}

export interface GithubWorkflowJob {
  id: number
  run_id: number
  run_url: string
  run_attempt: number
  node_id: string
  head_sha: string
  url: string
  html_url: string
  status: string
  conclusion: string
  created_at: string
  started_at: string
  completed_at: string
  name: string
  steps: GithubWorkflowStep[]
  check_run_url: string
  labels: string[]
  runner_id: number
  runner_name: string
  runner_group_id: number
  runner_group_name: string
  workflow_name: string
  head_branch: string
}

export interface GithubWorkflowStep {
  name: string
  status: string
  conclusion: string
  number: number
  started_at: string
  completed_at: string
}

export interface GithubPullRequestReview {
  id: number
  node_id: string
  user: GithubUser
  body: string
  state: string
  html_url: string
  pull_request_url: string
  submitted_at: string
  commit_id: string
}

export interface GithubPullRequestReviewComment {
  id: number
  node_id: string
  diff_hunk: string
  path: string
  position: number
  original_position: number
  commit_id: string
  original_commit_id: string
  user: GithubUser
  body: string
  created_at: string
  updated_at: string
  html_url: string
  pull_request_url: string
  author_association: string
}

export interface GithubCommitComment {
  id: number
  node_id: string
  url: string
  html_url: string
  body: string
  path: string
  position: number
  line: number
  commit_id: string
  user: GithubUser
  created_at: string
  updated_at: string
  author_association: string
}

export interface GithubCheckSuite {
  id: number
  node_id: string
  head_branch: string
  head_sha: string
  status: string
  conclusion: string
  url: string
  before: string
  after: string
  pull_requests: any[]
  app: any
  created_at: string
  updated_at: string
  latest_check_runs_count: number
  check_runs_url: string
  head_commit: GithubCommit
}

export interface GithubCheckRun {
  id: number
  head_sha: string
  node_id: string
  external_id: string
  url: string
  html_url: string
  details_url: string
  status: string
  conclusion: string
  started_at: string
  completed_at: string
  output: {
    title: string
    summary: string
    text: string
    annotations_count: number
    annotations_url: string
  }
  name: string
  check_suite: {
    id: number
  }
  app: any
  pull_requests: any[]
}

export interface GithubDiscussion {
  id: number
  node_id: string
  html_url: string
  title: string
  body: string
  category: {
    id: number
    name: string
    slug: string
  }
  answer_html_url: string
  answer_chosen_at: string
  answer_chosen_by: GithubUser
  author_association: string
  locked: boolean
  state_reason: string
  user: GithubUser
  created_at: string
  updated_at: string
  comments: number
  reactions: any
}

export interface GithubDiscussionComment {
  id: number
  node_id: string
  html_url: string
  parent_id: number
  child_comment_count: number
  repository_url: string
  discussion_id: number
  author_association: string
  user: GithubUser
  created_at: string
  updated_at: string
  body: string
}

export interface GithubPackage {
  id: number
  name: string
  package_type: string
  owner: GithubUser
  version: string
  description: string
  html_url: string
  created_at: string
  updated_at: string
  registry: {
    about_url: string
    name: string
    type: string
    url: string
    vendor: string
  }
}

export interface GithubDeployment {
  url: string
  id: number
  node_id: string
  sha: string
  ref: string
  task: string
  payload: any
  original_environment: string
  environment: string
  description: string
  creator: GithubUser
  created_at: string
  updated_at: string
  statuses_url: string
  repository_url: string
  transient_environment: boolean
  production_environment: boolean
  performed_via_github_app: any
}

export interface GithubDeploymentStatus {
  url: string
  id: number
  node_id: string
  state: string
  creator: GithubUser
  description: string
  environment: string
  target_url: string
  created_at: string
  updated_at: string
  deployment_url: string
  repository_url: string
  environment_url: string
  log_url: string
  performed_via_github_app: any
}

export interface GithubMilestone {
  id: number
  number: number
  title: string
  description: string
  state: string
  created_at: string
  updated_at: string
  due_on: string
  closed_at: string
  creator: GithubUser
  html_url: string
}

export interface GithubProject {
  owner_url: string
  url: string
  columns_url: string
  id: number
  node_id: string
  name: string
  body: string
  number: number
  state: string
  creator: GithubUser
  created_at: string
  updated_at: string
  organization_permission: string
  private: boolean
  permissions: {
    read: boolean
    write: boolean
    admin: boolean
  }
  html_url: string
}

export interface GithubProjectCard {
  url: string
  id: number
  node_id: string
  note: string
  creator: GithubUser
  created_at: string
  updated_at: string
  archived: boolean
  column_name: string
  project_id: number
  column_url: string
  content_url: string
  project_url: string
}

export interface GithubProjectColumn {
  url: string
  project_url: string
  cards_url: string
  id: number
  node_id: string
  name: string
  created_at: string
  updated_at: string
}

export interface GithubSecurityAdvisory {
  severity: string
  summary: string
  description: string
  identifiers: Array<{
    type: string
    value: string
  }>
  references: Array<{
    url: string
  }>
  published_at: string
  updated_at: string
  withdrawn_at: string
  vulnerabilities: Array<{
    package: {
      ecosystem: string
      name: string
    }
    severity: string
    vulnerable_version_range: string
    first_patched_version: {
      identifier: string
    }
  }>
}

export interface GithubSponsorship {
  node_id: string
  created_at: string
  sponsor: GithubUser
  sponsee: GithubUser
  privacy_level: string
  tier: {
    node_id: string
    created_at: string
    description: string
    monthly_price_in_cents: number
    monthly_price_in_dollars: number
    name: string
    is_one_time: boolean
    is_custom_amount: boolean
  }
}

export interface GithubTeam {
  name: string
  id: number
  node_id: string
  slug: string
  description: string
  privacy: string
  url: string
  html_url: string
  members_url: string
  repositories_url: string
  permission: string
  parent: GithubTeam
}

export interface GithubLabel {
  id: number
  node_id: string
  url: string
  name: string
  description: string
  color: string
  default: boolean
}

export interface GithubMember {
  login: string
  id: number
  node_id: string
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
  site_admin: boolean
}