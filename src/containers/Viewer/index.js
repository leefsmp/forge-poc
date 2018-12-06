import { bindActionCreators } from 'redux'
import { withRouter } from 'react-router'
import { connect } from 'react-redux'
import ViewerView from './ViewerView'

const mapDispatchToProps = dispatch => bindActionCreators({
 
}, dispatch)

const mapStateToProps = state => ({
  appState: {
    navbar: {
      visible: true
    }
  },
  location: {
    query: {
      id: '1'
    }
  },
  setNavbarState: () => {},
  setViewerEnv: () => {}
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ViewerView))