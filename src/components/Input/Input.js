import React, {PureComponent} from 'react'
import './Input.scss'

export default class Input extends PureComponent {

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  static defaultProps = {
    onKeyDown: (e) => {},
    onChange: (e) => {},
    placeholder: '',
    className: '',
    name: 'input',
    valueInit: '',
    type: 'text',
    tabIndex: 1
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  focus() {
    this.input.focus()
  }

  /////////////////////////////////////////////////////////
  //
  //
  /////////////////////////////////////////////////////////
  render() {

    const className = [
      ...this.props.className.split(' '),
      'input'
    ].join(' ')

    return (
      <div className={className}>
        <input     
          onChange={e => this.props.onChange(e)}
          placeholder={this.props.placeholder} 
          onKeyDown={this.props.onKeyDown}
          tabIndex={this.props.tabIndex}
          disabled={this.props.disabled}
          ref={el => {this.input = el}}
          value={this.props.value}
          type={this.props.type} 
          name={this.props.name} 
          autoComplete='false'
        />
        <label htmlFor={this.props.name}/>
      </div>
    )
  }
}