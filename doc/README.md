# LangStudio Overview

LangStudio is a fullstack web application, designed to support students following a foreign language course, such as given at a community college (Volksuniversiteit in the Netherlands). At present it is geared toward Dutch-speaking students following an Indonesian language course, but the application itself is language-agnostic.

## For Students

LangStudio offers students the following functionality:

- Sign-in with a Google account to get access to the site's content.
- Browse 'articles' (e.g. lessons from a foreign language textbooks), organized into 'publications' (e.g. the textbooks themselves).
- Click or tap on foreign words in articles to quickly lookup a translation from the integrated dictionary, and access the full definition in the dictionary if so desired.
- Search the integrated dictionary by means of an auto-complete search field.
- Use provided flashcards to exercise word lists, optionally with audible and auto-play options.
- Navigate through related articles across publications by means of provided hash tags.
- Hear the pronunciation of foreign words and paragraphs by means of speech synthesis.
- Access from desktops/laptops, tablets and mobile phones.


## For System Administrators

The system administrator has access to the following functionality:

- Upload content (articles and dictionary) prepared by content providers to the server to make it immediately available to authorized users.
- Remove on-line articles.
- Define access groups and assign access rights for specific publications to authenticated users.

## For Content Providers

- Prepare and maintain content off-line as self-contained, plain text markdown documents.
- Format content (using markdown) as if preparing for print, or, conversely, scan printed texts and quickly markup for use with LangStudio.


## Design Philosophy

- Mobile first
- With respect to content, stay close to the printed format familiar to content providers.
- Facilitate easy conversion of scanned documents, and conversely make it easy to produce useful print-outs from content documents for physical hand-out.

### Content Format

Content is provided in the form of 'articles' organized into 'publications'. A publication should at minimum consist of an 'index' article, which defines the title of the publication and contains futher metadata for the publication and its articles.

Articles are plain text files in the (GFM) markdown format. They have a special header at the beginning of the file with metadata as required by the system. This metadata takes the form of HTML comments (i.e. hidden when displayed), e.g.:

```
<!-- header -->
<!-- sort-index: 10 -->
<!-- group-name: ham -->
<!-- end-header -->

# This is the article's title

```

The filename for an article must follow a prescribed format:

*publication*.*chapter*.`md`

where:

- *publication* is short name for the publication of which this article is a part,
- *chapter* is short name indicating the topic of the article.

> Example: `sneddon.4050-requests.md`

Note: The *publication* and *chapter* parts of the file name are used as URL parameters and should therefore include URL-safe characters only.

An 'index' article has `index` as the *chapter* part of the file name and describes a publication. Below is an example of the file `sneddon.index.md`:

```
<!-- header -->
<!-- foreign-lang: id -->
<!-- base-lang: en -->
<!-- author: James Neil Sneddon -->
<!-- publisher: Routledge -->
<!-- publication-date: 2010 -->
<!-- isbn: 978-0415581547 -->
<!-- group-name: sneddon -->
<!-- end-header -->

# Indonesian — A Comprehensive Grammar

## Bibliographical data

2ND EDITION

James Neil Sneddon
Revised and expanded by Alexander Adelaar, Dwi N. Djenar & Michael C. Ewing
```


