//import registerServiceWorker from './registerServiceWorker'
import { ConnectedRouter } from 'connected-react-router'
import { Provider } from 'react-redux'
import { history } from './reducers'
import { render } from 'react-dom'
import App from './containers/App'
import './font-awesome/main.css'
import store from './store'
import 'bootstrap-webpack'
import React from 'react'
import './index.scss'

const target = document.querySelector('#root')

render(
  <Provider store={store}>
    <ConnectedRouter history={history}>
      <div>
        <App/>
      </div>
    </ConnectedRouter>
  </Provider>,
  target
)

//registerServiceWorker()