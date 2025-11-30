# Tutorials

### Creating a workspace

```
$ nut create -d "Change XYZ"
01KBA98F91YBRNH3ARWJJSSA9E $ 
```

You've now entered your workspace.

Let's import repositories. This will take a while when running the command for the first time, but it will be faster when you run it next time.

This is because the import command is idempotent, and also it will cache common repository data across workspaces.

```
01KBA98F91YBRNH3ARWJJSSA9E $ nut import --skip-forks --user stefreak # or --org xyz
stefreak/buntspiel
Cloning into 'stefreak/buntspiel'...
done.
stefreak/dappcamp-health-plus
Cloning into 'stefreak/dappcamp-health-plus'...
done.
stefreak/garden-playground-exampleapp
Cloning into 'stefreak/garden-playground-exampleapp'...
done.
stefreak/kernel-test
Cloning into 'stefreak/kernel-test'...
done.
stefreak/nut
Cloning into 'stefreak/nut'...
done.
stefreak/ossf-scorecard-repro-2189
Cloning into 'stefreak/ossf-scorecard-repro-2189'...
done.
stefreak/swiftrest
Cloning into 'stefreak/swiftrest'...
done.
```

### Applying commands to a workspace

Now let's implement the change we need across all repositories.

Create a new branch:
```
01KBA98F91YBRNH3ARWJJSSA9E $ nut apply git checkout -b change-xyz
==> stefreak/buntspiel <==
Switched to a new branch 'change-xyz'

==> stefreak/dappcamp-health-plus <==
Switched to a new branch 'change-xyz'

==> stefreak/garden-playground-exampleapp <==
Switched to a new branch 'change-xyz'

==> stefreak/kernel-test <==
Switched to a new branch 'change-xyz'

==> stefreak/nut <==
Switched to a new branch 'change-xyz'

==> stefreak/ossf-scorecard-repro-2189 <==
Switched to a new branch 'change-xyz'

==> stefreak/swiftrest <==
Switched to a new branch 'change-xyz'
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

### Running scripts
Of course you can make changes yourself (for example in your favourite code editor).

Sometimes it's useful to run a script to automate decision making.

The script will run inside the repository.

```
01KBA98F91YBRNH3ARWJJSSA9E $  cat ~/change-xyz.sh
#!/bin/sh
touch XYZ.md
echo Created new file XYZ.md
01KBA98F91YBRNH3ARWJJSSA9E $ nut apply -s ~/change-xyz.sh
==> stefreak/buntspiel <==
Created new file XYZ.md

==> stefreak/dappcamp-health-plus <==
Created new file XYZ.md

==> stefreak/garden-playground-exampleapp <==
Created new file XYZ.md

==> stefreak/kernel-test <==
Created new file XYZ.md

==> stefreak/nut <==
Created new file XYZ.md

==> stefreak/ossf-scorecard-repro-2189 <==
Created new file XYZ.md

==> stefreak/swiftrest <==
Created new file XYZ.md
```

Use the status command to keep track of what's going on.

```
% nut status
Workspace status:
  7 repositories total
  0 clean, 7 with changes

Repositories with changes:

  stefreak/buntspiel (change-xyz)
    1 untracked file(s)

  stefreak/dappcamp-health-plus (change-xyz)
    1 untracked file(s)

  stefreak/garden-playground-exampleapp (change-xyz)
    1 untracked file(s)

  stefreak/kernel-test (change-xyz)
    1 untracked file(s)

  stefreak/nut (change-xyz)
    1 untracked file(s)

  stefreak/ossf-scorecard-repro-2189 (change-xyz)
    1 untracked file(s)

  stefreak/swiftrest (change-xyz)
    1 untracked file(s)
```

Let's add and commit the changes:
```
stefreak@MacBookPro 01KBA98F91YBRNH3ARWJJSSA9E % nut apply git add .
==> stefreak/buntspiel <==

==> stefreak/dappcamp-health-plus <==

==> stefreak/garden-playground-exampleapp <==

==> stefreak/kernel-test <==

==> stefreak/nut <==

==> stefreak/ossf-scorecard-repro-2189 <==

==> stefreak/swiftrest <==

stefreak@MacBookPro 01KBA98F91YBRNH3ARWJJSSA9E % nut apply git commit -m "Change XYZ"

==> stefreak/buntspiel <==
[change-xyz 62f055f] Change XYZ
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 XYZ.md

==> stefreak/dappcamp-health-plus <==
[change-xyz f647749] Change XYZ
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 XYZ.md

==> stefreak/garden-playground-exampleapp <==
[change-xyz 5e85c2e] Change XYZ
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 XYZ.md

==> stefreak/kernel-test <==
[change-xyz 49bc2b8] Change XYZ
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 XYZ.md

==> stefreak/nut <==
[change-xyz fe0a7f5] Change XYZ
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 XYZ.md

==> stefreak/ossf-scorecard-repro-2189 <==
[change-xyz 1928926] Change XYZ
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 XYZ.md

==> stefreak/swiftrest <==
[change-xyz f2a6765] Change XYZ
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 XYZ.md
```

### Managing pull requests

You can manage pull requests using the [official GitHub CLI](https://cli.github.com/):

```
01KBA98F91YBRNH3ARWJJSSA9E % nut apply sh -c "git push -u origin HEAD && gh pr create --fill"

==> stefreak/buntspiel <==
Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.
Delta compression using up to 10 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 270 bytes | 270.00 KiB/s, done.
Total 3 (delta 1), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (1/1), completed with 1 local object.
To github.com:stefreak/buntspiel.git
   6c5e9d0..62f055f  HEAD -> change-xyz
branch 'change-xyz' set up to track 'origin/change-xyz'.

Creating pull request for change-xyz into main in stefreak/buntspiel

https://github.com/stefreak/buntspiel/pull/2

==> stefreak/dappcamp-health-plus <==
Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.
Delta compression using up to 10 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 346 bytes | 346.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0), pack-reused 0 (from 0)
To github.com:stefreak/dappcamp-health-plus.git
   bd7a6eb..f647749  HEAD -> change-xyz
branch 'change-xyz' set up to track 'origin/change-xyz'.

Creating pull request for change-xyz into main in stefreak/dappcamp-health-plus

https://github.com/stefreak/dappcamp-health-plus/pull/2

==> stefreak/garden-playground-exampleapp <==
Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.
Delta compression using up to 10 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 275 bytes | 275.00 KiB/s, done.
Total 3 (delta 1), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (1/1), completed with 1 local object.
To github.com:stefreak/garden-playground-exampleapp.git
   31103c7..5e85c2e  HEAD -> change-xyz
branch 'change-xyz' set up to track 'origin/change-xyz'.

Creating pull request for change-xyz into master in stefreak/garden-playground-exampleapp

https://github.com/stefreak/garden-playground-exampleapp/pull/2

==> stefreak/kernel-test <==
Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.
Writing objects: 100% (3/3), 244 bytes | 244.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0), pack-reused 0 (from 0)
To github.com:stefreak/kernel-test.git
   b37b9ad..49bc2b8  HEAD -> change-xyz
branch 'change-xyz' set up to track 'origin/change-xyz'.

Creating pull request for change-xyz into test-foo in stefreak/kernel-test

https://github.com/stefreak/kernel-test/pull/1

==> stefreak/nut <==
Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.
Delta compression using up to 10 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 271 bytes | 271.00 KiB/s, done.
Total 3 (delta 1), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (1/1), completed with 1 local object.
To github.com:stefreak/nut.git
   9a4fba7..fe0a7f5  HEAD -> change-xyz
branch 'change-xyz' set up to track 'origin/change-xyz'.

Creating pull request for change-xyz into main in stefreak/nut

https://github.com/stefreak/nut/pull/24

==> stefreak/ossf-scorecard-repro-2189 <==
Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.
Delta compression using up to 10 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 341 bytes | 341.00 KiB/s, done.
Total 3 (delta 0), reused 0 (delta 0), pack-reused 0 (from 0)
To github.com:stefreak/ossf-scorecard-repro-2189.git
   444bf5e..1928926  HEAD -> change-xyz
branch 'change-xyz' set up to track 'origin/change-xyz'.

Creating pull request for change-xyz into main in stefreak/ossf-scorecard-repro-2189

https://github.com/stefreak/ossf-scorecard-repro-2189/pull/2

==> stefreak/swiftrest <==
Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.
Delta compression using up to 10 threads
Compressing objects: 100% (2/2), done.
Writing objects: 100% (3/3), 275 bytes | 275.00 KiB/s, done.
Total 3 (delta 1), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (1/1), completed with 1 local object.
To github.com:stefreak/swiftrest.git
   0213703..f2a6765  HEAD -> change-xyz
branch 'change-xyz' set up to track 'origin/change-xyz'.

Creating pull request for change-xyz into master in stefreak/swiftrest

https://github.com/stefreak/swiftrest/pull/2
```

You can even manage existing PRs. We want to close these test PRs now to conclude the tutorial:
```
nut apply gh pr close -c "this was a test"
01KBA98F91YBRNH3ARWJJSSA9E % nut apply gh pr close change-xyz -d -c "this was a test"
==> stefreak/buntspiel <==
✓ Closed pull request stefreak/buntspiel#2 (Change XYZ)
✓ Deleted branch change-xyz and switched to branch main

==> stefreak/dappcamp-health-plus <==
✓ Closed pull request stefreak/dappcamp-health-plus#2 (Change XYZ)
✓ Deleted branch change-xyz and switched to branch main

==> stefreak/garden-playground-exampleapp <==
✓ Closed pull request stefreak/garden-playground-exampleapp#2 (Change XYZ)
✓ Deleted branch change-xyz and switched to branch master

==> stefreak/kernel-test <==
✓ Closed pull request stefreak/kernel-test#1 (Change XYZ)
✓ Deleted branch change-xyz and switched to branch test-foo

==> stefreak/nut <==
✓ Closed pull request stefreak/nut#24 (Change XYZ)
✓ Deleted branch change-xyz and switched to branch main

==> stefreak/ossf-scorecard-repro-2189 <==
✓ Closed pull request stefreak/ossf-scorecard-repro-2189#2 (Change XYZ)
✓ Deleted branch change-xyz and switched to branch main

==> stefreak/swiftrest <==
✓ Closed pull request stefreak/swiftrest#2 (Change XYZ)
✓ Deleted branch change-xyz and switched to branch master
```
