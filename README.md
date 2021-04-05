# React Gatekeeper

A simplified solution for role-based access control and conditional component rendering on React applications.

The Gatekeeper manages access to views and conditional component rendering comparing claims found in users' JWT access tokens against a set of authorized (compound) roles. Claims hold the role(s) of each user within the application. Compound roles combine groups that users are associated with (orgTypes) and their role within each group (role).

To clarify the concept, consider John who's a sales manager at a retail company. His claims might include a global scope within the company, as well as an scope specific to the sales department. His decoded JWT token would look something like this:

```
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022
  "departments": [{ // 'organizations' is John's root claims property
    "department": "global", // 'department' is the orgType property on each claim
    "role": "employee" // 'role' is orgRole property on each claim
  }, {
    "department": "sales",
    "role": "manager"
  }]
}
```

Therefore, John's compound roles within the company could be summarized as `['global:employee', 'sales:manager']`.

## Sample Quick Start

The easiest way to start using React Gatekeeper right away is learning from an example.

```
# Dummy application structure
|
|- <Components>
  |- IndividualPerformance.js
  |- TeamPerformance.js
|- <Views>
  |- Intranet.js
  |- SalesTeam.js
  |- SignIn.js
  |- 404.js
|- App.js
|- Gatekeeper.js
```

### Step 1: Initialize your Gatekeeper

```javascript
// ./Gatekeeper.js
import Gatekeeper from 'react-gatekeeper'

const gatekeeper = new Gatekeeper({
  rootClaimsProperty: 'departments',
  claimOrgTypeProp: 'department',
  claimOrgRoleProp: 'role',
})

gatekeeper.addRule({
  route: '/intranet',
  whitelist: ['global:employee'],
})
/* a service provider holding a claim 'global:ext' wouldn't have access to the company's intranet */
gatekeeper.addRule({
  route: '/sales-team',
  whitelist: ['sales:*'],
})

export default gatekeeper
```

### Step 2: Layout your application routes with the Gatekeeper

```javascript
// ./App.js
import React from 'react'
import {
  BrowserRouter, Switch, Route,
} from 'react-router-dom'

import gatekeeper from './Gatekeeper'
import Intranet from './Views/Intranet'
import SalesTeam from './Views/SalesTeam'
import SignIn from './Views/SignIn'
import NotFound from './Views/404'

function App() {
  const accessToken = undefined /* retrieve the user accessToken */
  gatekeeper.setUserToken(accessToken)

  const restrictedRoutes = [{
    path: '/intranet',
    component: Intranet,
  }, {
    path: '/sales-team',
    component: SalesTeam,
  }]

  return (
    <BrowserRouter>
        <Switch>
          {restrictedRoutes.map((route) => (
            gatekeeper.routeGate(route.path)
              ? <Route path={route.path} component={route.component} />
              : <Route path={route.path} component={!accessToken ? SignIn : NotFound} />
          ))}
          <Route path='/sign-in*' component={SignIn} />
          <Route path='*' component={NotFound} />
        </Switch>
    </BrowserRouter>
  )
}

export default App
```

### Step 3: Add conditional rendering to your view components

```javascript
// ./Views/SalesTeam.js
import React from 'react'

import gatekeeper from '../Gatekeeper'
import IndividualPerformance from '../Components/IndividualPerformance'
import TeamPerformance from '../Components/TeamPerformance'

function SalesTeam() {
  // TeamPerformance will be rendered only to sales managers
  // IndividualPerformance will be rendered only to sales reps
  return(<div>
    {gatekeeper.componentGate(['sales:manager'], TeamPerformance)}
    {gatekeeper.componentGate(['sales:rep'], IndividualPerformance)}
  </div>)
}

export default SalesTeam
```
