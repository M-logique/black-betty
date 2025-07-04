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