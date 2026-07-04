# DEC Viewer

DEC Viewer is a web interface for experimenting with DEC reasoning over RDF
datasets. It is designed to work with
[`dec-reasoner`](https://github.com/fvitali/dec-reasoner), which provides the
Apache Jena Fuseki backend and the DEC reasoning model.

DEC stands for **Doxastic, Epistemic, and Conjectural**. The viewer lets users
load small RDF datasets, run SPARQL updates and queries, and inspect how the DEC
Reasoner materialises cognitive worlds, permeation, inferred statements,
disagreements, and delusional worlds.

A live demonstrator is available at:

<https://w3id.org/conjectures/dec>

The reasoner source code is maintained separately in the
[`dec-reasoner`](https://github.com/fvitali/dec-reasoner) repository.

The project is part of the work described in:

> Fabio Vitali and Valentina Pasqual, *Provenance-Enhanced Statements in
> Knowledge Graphs*, arXiv:2606.15246, 2026.
> <https://arxiv.org/abs/2606.15246>

## Status

This is a research demonstrator. It is intended to expose the behaviour of the
DEC Reasoner through a browser interface. It is not a general-purpose RDF editor
or a production SPARQL workbench.

The current codebase uses:

- Node.js;
- Express;
- Axios;
- Bootstrap in the browser UI;
- a running DEC Reasoner / Fuseki backend.

## What the viewer does

DEC Viewer provides an interactive interface for:

- reading the DEC introduction and examples;
- loading example RDF datasets into the backend;
- editing and submitting custom SPARQL Update data;
- clearing the dataset before loading new data;
- running SPARQL queries;
- showing results as raw SPARQL JSON, tables, or grouped rows;
- rendering RDF nodes as full URIs, prefixed names, or human-readable labels;
- filtering out standard RDF/RDFS/OWL/XSD triples or shared statements;
- editing the prefix and label mappings used by the interface.

The viewer itself does not implement DEC reasoning. Reasoning is performed by
the DEC Reasoner backend. The viewer sends SPARQL updates and queries to that
backend and displays the returned materialised dataset.

## DEC concepts shown by the viewer

The examples and introductory pages focus on cognitive worlds and their
permeation behaviour:

| World type | Meaning |
|---|---|
| `dec:verbatimWorld` | A reported wording or assertion kept exactly as stated. No inference is performed inside it. |
| `dec:sharedWorld` | Background knowledge available to reality and to non-verbatim worlds. |
| `dec:doxasticWorld` | A belief, opinion, conviction, or subjective stance independent of reality. |
| `dec:epistemicWorld` | Knowledge, discovery, judgment, or accepted evidence. Its consequences become factual. |
| `dec:conjecturalWorld` | A hypothesis or supposition evaluated against reality without becoming factual. |
| `dec:realityWorld` | The factual core: ordinary assertions, shared knowledge, and epistemic consequences. |

The viewer also includes examples involving:

- `dec:disagreesWith`, for worlds that cannot be true together;
- `dec:delusionalWorld`, for worlds that disagree with reality;
- `dec:checkInconsistencies`, for reasoner-based inconsistency checks;
- `dec:closedFor`, for local closure over a predicate.

## User interface

The main page is divided into two areas.

The left side contains:

- **Introduction**, loaded from `public/info.html`;
- **Examples**, loaded from `public/examples.html`;
- **Append data**, for SPARQL Update input;
- **Query data**, for SPARQL query input.

The right side shows the response from the backend:

- **Raw**: the raw response;
- **Tabled**: tabular bindings;
- **Grouped**: grouped bindings.

Two sliders control display:

- **Show**: full URIs, prefixed names, or labels;
- **Hide**: nothing, standard RDF/RDFS/OWL/XSD triples, or shared statements.

The **Prefixes** and **Labels** dialogs allow users to change the mappings used
for display and query editing. Settings are saved in browser local storage.

## Backend interaction

The Node.js server serves the static web application and proxies requests to the
DEC Reasoner backend.

By default, the server expects Fuseki at:

```text
http://localhost:3030
```

and sends requests to:

| Local viewer route | Backend route |
|---|---|
| `POST /sparql` | `/dec/sparql` |
| `POST /update` | `/dec/update` |

After an update, the server queries the full dataset content and returns it to
the browser for display.

The backend URL can be configured with:

```bash
FUSEKI_URL=http://localhost:3030
```

## Installation

Prerequisites:

- Node.js;
- npm;
- a running DEC Reasoner instance.

Clone and install:

```bash
git clone https://github.com/fvitali/dec-viewer.git
cd dec-viewer
npm install
```

Start the viewer:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

To point the viewer to a remote DEC Reasoner instance:

```bash
FUSEKI_URL=http://reasoner-host:3030 npm start
```

## Configuration

The main server-side option is:

| Variable | Default | Meaning |
|---|---|---|
| `FUSEKI_URL` | `http://localhost:3030` | Base URL of the DEC Reasoner / Fuseki backend. |

The application resources are configured in `public/config.js`:

| Resource | Default file |
|---|---|
| Introduction | `public/info.html` |
| Examples | `public/examples.html` |
| Prefixes | `public/prefixes.txt` |
| Labels | `public/labels.json` |

## Repository layout

```text
dec-viewer/
├── package.json
├── server.js
├── datasetName.js
├── LICENSE
├── README.md
└── public/
    ├── index.html
    ├── main.js
    ├── app.js
    ├── ui.js
    ├── config.js
    ├── viewer.css
    ├── info.html
    ├── examples.html
    ├── prefixes.txt
    └── labels.json
```

## Related projects

- DEC live demonstrator: <https://w3id.org/conjectures/dec>
- DEC Viewer source code: <https://github.com/fvitali/dec-viewer>
- DEC Reasoner source code: <https://github.com/fvitali/dec-reasoner>

## Citation

```bibtex
@misc{vitali_pasqual_2026_dec,
  title        = {Provenance-Enhanced Statements in Knowledge Graphs},
  author       = {Fabio Vitali and Valentina Pasqual},
  year         = {2026},
  eprint       = {2606.15246},
  archivePrefix = {arXiv},
  url          = {https://arxiv.org/abs/2606.15246}
}
```

## License

This project is released under the MIT License. See [`LICENSE`](LICENSE).
