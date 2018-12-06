import { bindActionCreators } from 'redux'
import { Link } from 'react-router-dom'
import { connect } from 'react-redux'
import React from 'react'
import './Home.scss'

const mapDispatchToProps = dispatch => bindActionCreators({
  
}, dispatch)

const mapStateToProps = state => ({
 
})

const Home = (props) => (
  <div className="home">
    <div className="title">
      <br/>
      <Link className="app-link" to="/viewer?id=1">
        Markups + Transforms + Config
      </Link>
      <br/>
      <br/>
      <Link className="app-link" to="/viewer?id=2">
        Extensions Manager
      </Link>
      <br/>
      <br/>
      <Link className="app-link" to="/viewer?id=3">
        Readonly
      </Link>
    </div>
  </div>
)

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Home)