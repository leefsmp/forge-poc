import React from 'react'

class Loader extends React.PureComponent {

  static defaultProps = {
    background: '#ededed',
    color: '#0089c7'
  }

  render () {

    const className = 'loader-background' +
      (!this.props.show ? ' disabled' : '')

    const style = {
      transitionProperty: !this.props.show
        ? ' background' : 'none',
      background: this.props.background
    }

    const loaderStyle = {
      color: this.props.color
    }

    return (
      <div className={className} style={style}>
        <div className="loader" style={loaderStyle}/>
      </div>
    )
  }
}

export default Loader
