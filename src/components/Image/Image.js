import PropTypes from 'prop-types'
import React from 'react'
import './Image.scss'

export default class Image extends React.PureComponent {

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  static propTypes = {
    className: PropTypes.string,
    errorSrc: PropTypes.string
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  static defaultProps = {
    errorSrc: '/resources/img/default.png',
    className: ''
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  constructor (props) {

    super (props)

    this.state = {
      classNames: ['default-img'],
      src: this.props.src
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onLoad = () => {

    if (!this.loadError) {
      this.setState({
        classNames: []
      })
    }
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  onError = () => {

    this.loadError = true

    this.setState({
      src: this.props.errorSrc
    })
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  render () {

    const classNames = [
      'image',
      ...this.state.classNames,
      ...this.props.className.split(' ')
    ]

    return(
      <img className={classNames.join(' ')}
        onError={this.onError}
        onLoad={this.onLoad}  
        src={this.state.src}
      />
    )
  }
}
