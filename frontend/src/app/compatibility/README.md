The compatibility policies are high level policies.

They are used by the entrypoints to control the `wvWebviewer` directive. The `wvWebiewer` directive itself has no idea of mobile compatibility. Instead, the `wvWebviewer` directive provide enough customizability to delegate this matter at a upper level.

```
                    UserInterface                           -> ...
Entrypoint  ->            +             ->  wvWebviewer     -> layout
                    ImageLoading                            -> ...
```

