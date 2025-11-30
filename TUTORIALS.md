# Tutorials

### Creating a workspace

```
$ nut create -d "Change XYZ"
```

You've now entered your workspace.

Let's import repositories. This will take a while when running the command for the first time, but it will be faster when you run it next time.

This is because the import command is idempotent, and also it will cache common repository data across workspaces.

```
01KBA98F91YBRNH3ARWJJSSA9E $ nut import --user stefreak # or --org xyz
```

### Applying commands to a workspace

Now let's implement the change we need across all repositories.

```
01KBA98F91YBRNH3ARWJJSSA9E $ nut apply git checkout -b change-xyz
01KBA98F91YBRNH3ARWJJSSA9E $ nut apply git commit --allow-empty -m "chore: Change XYZ"
```

You can also apply a script to automate decision making.
The script will run inside the repository.

```
01KBA98F91YBRNH3ARWJJSSA9E $ nut apply -s ~/change-xyz.sh
```

### The status command 

This command helps you to quickly understand what's going on in all repositories.

```
01KBA98F91YBRNH3ARWJJSSA9E $ nut status
Workspace status:
  11 repositories total
  11 clean, 0 with changes

All repositories are clean.
```

### Managing pull requests

You can manage pull requests using the [official GitHub CLI](https://cli.github.com/):

```
nut apply sh -c "git push -u origin HEAD && gh pr create --fill"
```

```
nut apply gh pr close -c "this was a test"
```
