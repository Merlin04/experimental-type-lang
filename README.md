# Experimental type lang

This is a weird programming language somewhat based off of the TypeScript type system. It's not intended to be practical; it's just an experiment to see how far you can push a few basic concepts.

## Setup

To set up the language, just clone the repo, run `yarn` to install dependencies, then run `yarn eval [filename]` to run a file.

## Language overview

In this language all data is built from items (represented by an `_`). An item has no properties beyond its existance - think of it like `true`, except there's no corresponding `false`. There are also arrays, which you can use to form numbers:

```
2 = [_, _]
5 = [_, _, _, _, _]
0 = []
```

Although you can enter numbers in source code, they behave like arrays of items. 

Instead of functions, there are type definitions, which look similar to their TypeScript equivalent (but aren't actually types):

```
type WrapSomethingInAnArray<Item> = [Item];
```

You can evaluate expressions by just writing them; the interpreter will print out the result.

```
WrapSomethingInAnArray<5>;
> [
      {
          "__typename": "Number",
          "length": 5
      }
  ]
```

Right now the interpreter returns a JSON version of the internal representation of the data. It tries to avoid actually storing numbers as arrays of items for performance, so even if the expression being evaluated isn't directly a number the output might be:

```
[_];
> {
      "__typename": "Number",
      "length": 1
  }
```

However, items still exist internally, as the interpreter isn't perfectly optimized:

```
WrapSomethingInAnArray<[_, 6]>;
> [
      [
          {
              "__typename": "Item"
          },
          {
              "__typename": "Number",
              "length": 6
          }
      ]
  ]
```

So how do we actually do anything with data? Two ways - array spreads and condition expressions.

Array spreads work like you'd expect:

```
[...[1, 2, 3], ...[4, 5, 6]];
> [
      {
          "__typename": "Number",
          "length": 1
      },
      {
          "__typename": "Number",
          "length": 2
      },
      {
          "__typename": "Number",
          "length": 3
      },
      {
          "__typename": "Number",
          "length": 4
      },
      {
          "__typename": "Number",
          "length": 5
      },
      {
          "__typename": "Number",
          "length": 6
      }
  ]
```

Because numbers are just arrays of items, we can use a spread expression to make an add function by concatenating the numbers together:

```
type Add<N1, N2> = [...N1, ...N2];

Add<5, 6>;
> {
      "__typename": "Number",
      "length": 11
  }
```

However, this only gets us so far. The other tool is conditional expressions, which look like this:

```
type Test<Input> = Input extends 5 ? 1 : 0;

Test<5>;
> {
      "__typename": "Number",
      "length": 1
  }

Test<4>;
> {
      "__typename": "Number",
      "length": 0
  }
```

When used like this, it's just an if statement. But, using the `infer` keyword you can do more complicated things:

```
type GetSecondArrayItem<Input> = Input extends [infer, infer B, ...infer] ? B : abort;

GetSecondArrayItem<[5, 6, 7, 8]>;
> {
      "__typename": "Number",
      "length": 6
  }

GetSecondArrayItem<4>;
> {
      "__typename": "Item"
  }

GetSecondArrayItem<[1]>;
> Error: Exiting due to abort keyword
```

The `infer` keyword causes the interpreter to figure out what is in that position and allow you to access it. `...infer` acts similarly but it provides an array of any number of items. If you don't actually need the value of the inferred item just don't pass an identifier.

You can use both `infer` and other expressions at once:

```
type Test<Input> = Input extends [5, 6, infer Item, 8] ? Item : abort;

Test<[5, 6, 10, 8]>;
> {
      "__typename": "Number",
      "length": 10
  }

Test<[1, 2, 5, 8]>;
> Error: Exiting due to abort keyword
```

(Oh, and `abort` just causes the program to throw an error - it's great for handling invalid input.)

You can also add multiple unnamed `infer`s with the `skip` keyword:

```
type At<Array, Position> = Array extends [skip Position, infer Item, ...infer] ? Item : abort;
```

And that's the entire language! It doesn't seem like much but we can do some actually useful things with it.

## Implementing basic math

We already made an addition type:

```
type Add<N1, N2> = [...N1, ...N2];
```

Subtraction can be thought of as how many items are left over after you take away some number of items from a group of items. To achieve this we can spread the number of items being taken away into an array and infer the remaining number:

```
type Subtract<N1, N2> = N1 extends [...N2, ...infer Result] ? Result : abort;

Subtract<5, 2>;
> {
      "__typename": "Number",
      "length": 3
  }

Subtract<5, 5>;
> {
      "__typename": "Number",
      "length": 0
  }

Subtract<5, 8>;
> Error: Exiting due to abort keyword
```

The last case exited because `N2` was bigger than `N1` so no matter how many items `Result` contained the array could never be the same length as `N1`. We can handle that case by attempting the subtraction again with the inputs swapped and providing a sort of flag to indicate that the number was negative:

```
type Subtract<N1, N2> = N1 extends [...N2, ...infer Result] ? Result : [_, Subtract<N2, N1>];

Subtract<5, 8>;
> [
      {
          "__typename": "Item"
      },
      {
          "__typename": "Number",
          "length": 3
      }
  ]
```

And we can handle this result in a few ways:

```
type AbsoluteValue<Input> = Input extends [_, infer Number] ? Number : Input;

AbsoluteValue<Subtract<5, 2>>;
> {
      "__typename": "Number", 
      "length": 3
  }

AbsoluteValue<Subtract<5, 8>>;
> {
      "__typename": "Number",
      "length": 3
  }

type EnsurePositive<Input> = Input extends [_, infer] ? abort : Input;

EnsurePositive<Subtract<5, 2>>;
> {
      "__typename": "Number",
      "length": 3
  }

EnsurePositive<Subtract<5, 8>>;
> Error: Exiting due to abort keyword
```

Now let's try multiplication! Multiplication is just repeatedly adding the one number to itself another number of times, so we can keep a `Result` value and call `Multiply` to add `N1` to the `Result` until `N2` reaches 0. We can use a parameter with a default value to provide a sort of variable.

```
type Multiply<N1, N2, Result = 0> = N2 extends 0 ? Result : Multiply<N1, Subtract<N2, 1>, Add<Result, N1>>;
```

Fun fact: I initially wrote this in a completely different way. It appears to be slightly faster for small numbers but it's way slower for larger numbers. It works by adding the number over and over again to an array, then adding the array together until there's only the result left.

```
type Multiply<N1, N2, T = []> = N2 extends 0 ? Flatten<T> : Multiply<N1, Subtract<N2, 1>, [N1, ...T]>;

type Flatten<Input> = Input extends [infer A, infer B, ...infer rest] ? Flatten<[Add<A, B>, ...rest]> : Input extends [infer Value] ? Value : abort;
```

Now, let's try division. Similarly to how multiplication is repeated addition, division is repeated subtraction. Unfortunately we can't easily support floating point numbers so it will have to be integer division. 

To start, we'll make a utility type to check if a number is smaller than another. We'll use this in the `Divide` type to check if it's time to stop the subtraction. We'll also define true and false types (the actual value doesn't matter).

Also, from this point onwards I'm going to stop giving the whole JSON object for the output, it isn't very useful.

```
type True<> = 1;
type False<> = 0;
type IsLessThan<N1, N2> = N1 extends [...N2, ...infer] ? False<> : True<>;

IsLessThan<5, 3>;
> 0
IsLessThan<5, 5>;
> 0
IsLessThan<3, 5>;
> 1
```

Now we can make the division. It will repeatedly subtract `N2` from `N1` and increment `Result` until `N1` is less than `N2`. We'll also return the remainder because why not:

```
type Divide<N1, N2, Result = 0> = IsLessThan<N1, N2> extends True<> ? [Result, N1] : Divide<Subtract<N1, N2>, N2, Add<Result, 1>>;

Divide<10, 2>;
> [5, 0]
Divide<8, 3>;
> [2, 2]
Divide<100, 11>;
> [9, 1]
```

We can use the array indexing method from before to create a modulo function:

```
type Modulo<N1, N2> = At<Divide<N1, N2>, 1>;

Modulo<10, 2>;
> 0
Modulo<8, 3>;
> 2
Modulo<100, 11>;
> 1
```

TODO: create fizzbuzz

## Technical details

This is written in TypeScript. The only dependency is [Ohm](https://github.com/harc/ohm), which is used for parsing. The Ohm grammar is in `./g.ohm`, and an importable JS file and TypeScript types are generated from it by running `yarn generate`. When a program is run, the source code is first read and parsed by Ohm, which occurs in `./parser.ts`. It's then run through a semantics object which transforms the Ohm tree into an AST (which has typings defined in `./types.ts`). Finally, the AST is provided to `./evaler.ts`, which interprets the program and prints the output to the console.