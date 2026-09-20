# openbase — User Manual

Welcome! This is a simple guide that explains **what openbase is**, **what it is
for**, and **how to use it** step by step, in plain language.

---

## 1. What is openbase?

openbase is a **database that looks like a spreadsheet**. It is an alternative
to tools like Airtable, Notion, or Google Sheets for organizing information.

Instead of writing complicated code or SQL, you build your data like this:

- You make a **Base** (a "container" — like one workbook).
- Inside a Base you make **Tables** (lists of one kind of thing, like
  "Products" or "Orders").
- Each table has **Columns** (fields) for each piece of information
  (Name, Price, Quantity, Date, ...).
- Each table holds **Rows** (records) — one row per item (one product, one order).

You can see the same data as a **Grid** (a spreadsheet) or as a **Kanban**
board (cards you drag around), filter and sort it, link tables together, and
even write **formulas** that calculate values automatically.

---

## 1.1 Why do you need this?

Most people end up managing important information in places that do not really
work well as the amount of data grows:

- **Spreadsheets (Excel / Google Sheets)** are great to look at, but they are
  weak at keeping data *consistent*. There is nothing stopping someone from
  typing "Paid", "paid ", or "PAD" in a status column — and then filters and
  totals quietly break.
- **Documents / notes** cannot be sorted, filtered, linked, or recalculated at
  all. You read them page by page.
- **Full databases (SQL)** can do everything — but you have to write code and
  understand databases to use them.

openbase sits in between: **spreadsheet *ease* with database *and* structure**.

It helps you when you need to:

1. **Keep the same type of information in one organised list** — products,
   orders, contacts, tasks, inventory, expenses, anything with rows.
2. **Make sure data is consistent and clean** — single-select / checkbox
   columns only allow the options you set, so nobody can type a typo.
3. **Find things fast** — search across all text, filter by any rule, and sort
   by any column, and the app remembers how you set it up.
4. **See your work in different ways** — every table can be a Grid
   (detailed list) or a Kanban board (drag-and-drop cards) without changing
   your data.
5. **Connect related records** — link an order to its products, a task to its
   project, a patient to its appointments, instead of copy-pasting names.
6. **Automate calculations** — formulas total up prices, apply IF logic, join
   text, and recalculate themselves whenever the inputs change.
7. **Never lose the history of a record** — each row has its own detail page
   and files can be attached to it.

In short: **you need openbase when you want a spreadsheet that behaves like a
real database** — without learning anything about databases.

---

## 2. What do you need before you start?

openbase has two parts that must be running, and a database that must be set up
once. If someone set up the project for you, these steps are already done.

### 2.1 Set up the database (one time only)

The project uses Supabase as its database. The database tables are created with
files in `server/src/migrations/`.

1. Go to the **Supabase Dashboard** → **SQL Editor**.
2. Open each migration file, in order (`003_schema.sql`, `004_storage.sql`,
   `005_view_config.sql`, `006_formula.sql`), and press **Run**.
3. You only need to do this once.

### 2.2 Start the server (backend)

The server is the "engine" that talks to the database.

1. Open a terminal in the `server` folder.
2. Make sure a file called `.env` exists (copy `server/.env.example` and fill in
   your Supabase URL and keys if it does not).
3. Run:

   ```bash
   npm install
   npm run dev
   ```

4. You should see `Server running at http://localhost:4000`.

### 2.3 Start the app (frontend)

The app is the website you look at.

1. Open another terminal in the `client` folder.
2. Run:

   ```bash
   npm install
   npm run dev
   ```

3. Open your browser and go to: **http://localhost:5173**

---

## 3. Your first Base

1. **Create an account** on the sign-up page (any email + password), or log in.
2. On the left side of the screen you see the **Bases** list.
3. Click **+ New Base**, type a name (for example "Shop"), and press **Create**.
4. Click the name of your Base to open it.
5. Click **+ Table** to add a table (for example "Products").
6. Click the table name to open it.

You now have an empty grid — time to add columns and rows.

---

## 4. Columns (fields)

1. Click **+ Column** at the top right of the grid.
2. Give the column a **Name** (for example "Price").
3. Choose a **Field type** (see the table below).
4. Press **Add column**.

| Field type       | What it is for                                      |
| ---------------- | --------------------------------------------------- |
| Text             | Short words or sentences (names, titles)            |
| Long text        | Longer notes and paragraphs                         |
| Number           | Numbers, for counting or math                       |
| Checkbox         | Yes/no — a tick box                                 |
| Single select    | Pick **one** option from a list (e.g. "In stock")   |
| Multi select     | Pick **many** options from a list (e.g. colors)     |
| Date             | A calendar date                                     |
| Attachment       | Files and images (stored in the cloud)              |
| Linked record    | Points to rows in another table (see section 7)     |
| Formula          | A calculated value (see section 8)                  |

**Tip:** you can rename a column (click the ✎ icon) or delete it (click the ✕
icon) when you hover over the column header.

---

## 5. Rows (records)

1. Click **+ New row** at the bottom of the grid to add a row.
2. Click any cell and type to edit it.
3. The app saves your changes automatically as you work.
4. Open the **✕** icon at the end of a row to delete it.

**Every row has a detail page.** Click the **⤢** icon at the end of a row to
open a full "Record" screen where you can see and edit every field of that row
in one place.

---

## 6. Using the search, filter, and sort bar

Above the Grid (and the Kanban board) there is a toolbar.

- **Search** (right side): type any words — the app searches all text columns.
- **＋ Filter**: add a filter like "Price is more than 100" or "Status is
  'Shipped'". Click the little ✕ on a filter to remove it.
- **Sort**: choose columns to sort by (for example "Name" then "Price"), and
  switch each one between ↑ (up/A–Z) and ↓ (down/Z–A).
- **Clear all**: removes every filter, sort, and search at once.

The filters and sorts are saved for that table's view, so they are still there
when you come back later.

---

## 7. Linked records (connecting tables)

Put a **Linked record** column on a table to point at rows in **another table in
the same base**. For example, an "Orders" table can link to "Products".

1. In the "Orders" table click **+ Column**.
2. Choose **Linked record** as the type.
3. Pick **which table** to link to (for example "Products").
4. Press **Add column**.

Now click that cell in a row — a search box appears where you can find and tick
products. The cell shows the product's **first column value**, not the ID, so it
is easy to read.

Remove a link by unticking the product in the picker.

---

## 8. Formulas (auto-calculated values)

A **Formula** column calculates its value automatically from other columns in
the **same table**. Example: if you have "Price" and "Quantity", add a formula
column:

```
{Price} * {Quantity}
```

When Price or Quantity changes, the result updates by itself.

What you can use:

- `+`, `-`, `*`, `/` and parentheses: `({Price} - 5) * 2`
- Comparisons: `>`, `<`, `>=`, `<=`, `=`, `!=` (useful inside IF)
- `SUM(...)`: adds numbers up, e.g. `SUM({Price}, {Quantity}, 10)`
- `IF(condition, yes, no)`: e.g. `IF({Quantity} > 10, 'Big order', 'Small order')`
- `CONCAT(...)`: joins text together, e.g. `CONCAT('Order #', {Name})`

Rules and tips:

- Reference other columns with curly braces and the **exact column name**:
  `{Price}`.
- A formula cannot reference another formula column (this keeps it simple and
  safe).
- If a formula cannot be calculated, the cell shows a blank value instead of an
  error crashing the app.

---

## 9. Views: Grid and Kanban

At the top of every table you can switch between two ways of looking at your data.

### Grid
The spreadsheet view: rows on top, columns across. Good for reading a lot of data.

### Kanban
A board of cards you can drag between columns.

1. Click the **Kanban** tab.
2. Above the board, under **Group by**, pick the **single select** column you
   want to use (e.g. "Status").
3. Your rows become cards grouped into columns (one column per option, plus
   "No value" for rows with nothing chosen).
4. **Drag a card** from one column to another — the record's single select
   value is updated automatically.

The Kanban option you chose (and the filters from section 6) are remembered.

---

## 10. Troubleshooting

| Problem                                        | What to do                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| "Could not find the table ... in the schema"   | The database migrations were not run. Do section 2.1.             |
| Saving does nothing when I create a Base       | Same as above — run the migrations, then restart the server.      |
| Images/files won't upload                      | Make sure storage migration `004_storage.sql` was run.            |
| Server says "Server running" but app is empty  | Check that both `npm run dev` terminals are still running.        |
| Wrong answer in a formula field                | Check the column names match exactly (including spaces/case).     |

**Remember.** Always run the migrations **in order**, once, before using the app.

---

## 11. Where is your data stored?

- Table data lives in your **Supabase** database.
- Uploaded attachments are stored in the Supabase **Storage** bucket.
- Formulas are calculated on the backend every time a record is created,
  edited, or read — so the numbers you see are always fresh.

That's it! Create a Base, add a table, make some columns, and start typing.