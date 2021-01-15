# Zukit

_Framework serves as the basis for creating plugins or themes for WordPress._

Implements basic functionality for managing scripts and creating plugin or theme settings page based on Gutenberg functionality.

## Install
To _use_ __Zukit__ in your project, you need to install it as a `subtree` in your project. To simplify this process, I wrote a bash script [`zukit.sh`] that does all the necessary operations. You will need to download the script from the remote repository and then execute it. Before executing the script, you can change it and remove unnecessary (in your opinion) operations:

```shell
# retrieve 'zukit.sh' from the repository
$ curl 'https://raw.githubusercontent.com/picasso/zukit/master/zukit.sh' > zukit.sh

# maybe you have to give the script permission to run
# chmod +x zukit.sh

# execute script
$ sh zukit.sh
```

To update __Zukit__ to the current version, you need to run the `subtree pull` command. You can change the commit message at your discretion:
```shell
# pull updates from Zukit
$ git subtree pull --prefix=zukit zukit master --squash -m 'Zukit updated'
```

See [Git sparse-checkout](https://www.git-scm.com/docs/git-sparse-checkout) and [Git subtree](https://opensource.com/article/20/5/git-submodules-subtrees) for complete docs and examples.

> &#x2757; Памятка. Попробовать потом [иначе](https://docs.github.com/en/free-pro-team@latest/github/using-git/about-git-subtree-merges)

After installation, you can remove `zukit.sh` or add it to your `.gitignore` file.



## Documentation

The best way to learn a framework is to look at working examples of its use. This can be done in plugins that I have already adapted for the new framework: [Zu Contact](https://github.com/picasso/zu-contact) и [Zu Media](https://github.com/picasso/zumedia).

Documentation is available on the [GitHub wiki](https://github.com/picasso/zukit/wiki). There I described the main points of working with the framework.


------------------------------------------------------

### Structure of "Zukit"

- Folder __dist__ contains _production_ versions of js and css files;
- Folder __lang__ contains files needed for translations;
- Folder __snippets__ contains a collection of various functions that I have accumulated during my work with WordPress. They are combined into one class for ease of use;
- Folder __traits__ contains traits that are included in the class `zukit_Plugin`. Used to group functionality in a fine-grained and consistent way;
- Folder __src__ contains _source_ versions of `JS` and `CSS` files.

<!--
коды для emoji unicode
https://apps.timwhitlock.info/emoji/tables/unicode

```diff
- red
+ green
! orange
# gray
```
-->

<!-- See [Dmitry Rudakov Coding](https://dmitryrudakov.com/coding/) for complete docs and demos.
-->
