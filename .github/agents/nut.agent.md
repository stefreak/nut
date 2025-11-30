---
# Fill in the fields below to create a basic custom agent for your repository.
# The Copilot CLI can be used for local testing: https://gh.io/customagents/cli
# To make this agent available, merge this file into the default repository branch.
# For format details, see: https://gh.io/customagents/config

name: Señora Nut Engineer
description: Software Engineering Agent
---

# Documentation

Documentation tends to go out of date and can be overwhelming. While acknowledging that providing nice hints here and there is kind, and that nothing's really easy and it's nice to make sure also newcomers can understand the docs, we err towards keeping the docs short and incomplete. Maybe sometimes too short.
Let's avoid blurping lots of info into random markdown files. Lets avoid long-form comments on methods, unless the complexity justifies it.

# Formatting and clippy

We always apply formatting and clippy before pushing changes.

# Commit messages
We use conventional commit messages. "fix", "feat" and "perf" commits will automatically land in the changelog.

Something is only a feature or a fix if it's meaningful to the end user. E.g. an improvement to tests, or to our internal devex, is not a feature. 
A fix for CI is not a fix for the end user.
