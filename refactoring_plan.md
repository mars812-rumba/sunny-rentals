graph TD
    A[CRMPage] --> B[UserCard];
    A --> C[UserDialog];
    B --> D[crmAPI];
    C --> D;
    A --> D;
    subgraph Components
        B
        C
    end
    subgraph API
        D
    end
    subgraph Pages
        A
    end
```
