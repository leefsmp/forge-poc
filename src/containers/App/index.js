import logo from '../../resources/img/logo.png'
import { Route, Link, Switch } from 'react-router-dom'
import ServiceManager from 'SvcManager'
import 'react-reflex/styles.css'
import Viewer from '../Viewer'
import 'Dialogs/dialogs.scss'
import About from '../About'
import Home from '../Home'
import React from 'react'
import './App.scss'

class App extends React.Component {

  constructor (props) {
    super(props)
  }

  componentDidMount () {

    this.dialogSvc =
      ServiceManager.getService(
        'DialogSvc')

    this.dialogSvc.setComponent(this)
  }

  render () {

    return (
      <div className="app">
        <header className="app-header">
          <Link className="app-link" to="/">
            <img src={logo} className="app-logo" alt="logo"/>
            <label>
              Forge POC - Home
            </label>
          </Link>
          <div className="app-links">
            <Link className="app-link" to="/about">
              About
            </Link>
          </div>
        </header>
        <main>
        <Switch>
          <Route exact path="/index.html" component={Home}/>
          <Route exact path="/viewer" component={Viewer}/>
          <Route exact path="/about" component={About}/>
          <Route exact path="/" component={Home}/>
          <Route exact path="*" component={Home}/>
        </Switch>
        </main>
        { this.dialogSvc && this.dialogSvc.render() }
      </div>
    )
  }
}

export default App