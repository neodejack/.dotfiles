---
name: writing-elixir-docs
description: "Write documentation for Elixir modules, functions, types, and callbacks following official Elixir conventions. Use when asked to document Elixir code, add @moduledoc/@doc/@typedoc, write doctests, or improve Elixir documentation. Triggers on: document this elixir module, add elixir docs, write moduledoc, add doctests."
---

# Writing Elixir Documentation

Write and improve documentation for Elixir applications following the official Elixir documentation conventions.

## Core Principles

- Elixir treats documentation as a **first-class citizen** — it is a contract with API users, distinct from code comments.
- Documentation is written in **Markdown**.
- Documentation is attached via **module attributes**: `@moduledoc`, `@doc`, and `@typedoc`.
- Code comments are for developers reading source code; documentation is for API consumers.

## Module Attributes

### `@moduledoc` — Module documentation

Place at the top of the module, immediately after `defmodule`:

```elixir
defmodule MyApp.Hello do
  @moduledoc """
  This is the Hello module.
  """
end
```

### `@doc` — Function/macro documentation

Place immediately before the function definition:

```elixir
@doc """
Says hello to the given `name`.

Returns `:ok`.

## Examples

    iex> MyApp.Hello.world(:john)
    :ok

"""
def world(name) do
  IO.puts("hello #{name}")
end
```

### `@typedoc` — Type documentation

Place immediately before `@type` or `@opaque` definitions:

```elixir
@typedoc "A color represented as {red, green, blue} tuple"
@type color :: {non_neg_integer(), non_neg_integer(), non_neg_integer()}
```

## Documentation Metadata

Attach metadata by passing a keyword list to `@moduledoc`, `@doc`, or `@typedoc`:

### `:since` — Version annotation

```elixir
@doc since: "1.3.0"
def world(name), do: IO.puts("hello #{name}")
```

### `:deprecated` — Deprecation warning

```elixir
@doc deprecated: "Use Foo.bar/2 instead"
def old_function, do: :ok
```

To also emit a compile-time warning when the function is called, add `@deprecated`:

```elixir
@deprecated "Use Foo.bar/2 instead"
def old_function, do: :ok
```

### `:group` — Grouping in sidebar/autocomplete

```elixir
@doc group: "Query"
def all(query)

@doc group: "Schema"
def insert(schema)
```

## Style Rules (MUST follow)

1. **First paragraph must be concise** — typically one line. ExDoc uses it as the summary.
2. **Reference modules by full name** in backticks: `` `MyApp.Hello` ``, never `` `Hello` ``.
3. **Reference functions by name and arity**:
   - Local: `` `world/1` ``
   - External: `` `MyApp.Hello.world/1` ``
   - Callbacks: `` `c:world/1` ``
   - Types: `` `t:values/0` ``
4. **Use `##` for section headers** inside docs. Never use `#` — first-level headers are reserved for module/function names.
5. **Place documentation before the first clause** of multi-clause functions. Documentation is per function+arity, not per clause.
6. **Use `:since` metadata** when adding new functions or modules to annotate the version.
7. **Include examples** under a `## Examples` section whenever possible.

## Function Argument Names

The compiler infers argument names for documentation. If inference is suboptimal (e.g., shows `map` instead of a meaningful name), declare a function head:

```elixir
def size(map_with_size)
def size(%{size: size}), do: size
```

## Doctests

Include interactive examples prefixed with `iex>` inside documentation. These are testable via `ExUnit.DocTest`:

```elixir
@doc """
Adds two numbers.

## Examples

    iex> MyApp.Math.add(1, 2)
    3

"""
def add(a, b), do: a + b
```

In the corresponding test file:

```elixir
defmodule MyApp.MathTest do
  use ExUnit.Case, async: true
  doctest MyApp.Math
end
```

Rules for writing doctests:

- Start each expression with `iex>` and continuation lines with `...>`
- The expected result follows on the next line without any prefix
- Separate multiple examples with a blank line
- Doctests must return values that can be compared with `==`

## Hiding Modules and Functions

- Use `@moduledoc false` to hide an entire module from documentation.
- Use `@doc false` to hide individual functions.
- Prefer moving internal functions to a module marked `@moduledoc false` rather than scattering `@doc false`.
- Prefix truly internal functions with underscores (e.g., `__internal__/1`) — the compiler won't import these.

**Important:** `@doc false` and `@moduledoc false` do NOT make functions private. They only hide them from documentation. Use `defp` for truly private functions.

## Workflow

When asked to document Elixir code:

1. **Read the module** to understand its public API.
2. **Add `@moduledoc`** at the top of the module with a concise summary, then elaborate.
3. **Add `@doc`** to every public function and macro with:
   - A one-line summary as the first paragraph.
   - Parameter descriptions if not obvious.
   - Return value description.
   - A `## Examples` section with `iex>` doctests where feasible.
4. **Add `@typedoc`** to every public `@type` and `@opaque`.
5. **Add metadata** (`:since`, `:deprecated`, `:group`) where appropriate.
6. **Hide internals** — ensure internal modules have `@moduledoc false` and internal public functions have `@doc false` or are moved to a hidden module.
7. **Verify doctests** pass by running `mix test`.
