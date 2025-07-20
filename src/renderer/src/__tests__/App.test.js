import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import TerminalSession from '../components/TerminalSession.vue'

describe('App', () => {
  it('renders app component', () => {
    const wrapper = mount(App)
    expect(wrapper.find('#app').exists()).toBe(true)
  })

  it('displays app header with title', () => {
    const wrapper = mount(App)
    const header = wrapper.find('.app-header')
    expect(header.exists()).toBe(true)
    expect(header.find('h1').text()).toBe('CLI Buddy')
  })

  it('shows status indicator', () => {
    const wrapper = mount(App)
    const status = wrapper.find('.status')
    expect(status.exists()).toBe(true)
    expect(status.text()).toBe('Ready')
  })

  it('includes terminal session component', () => {
    const wrapper = mount(App)
    const terminalSession = wrapper.findComponent(TerminalSession)
    expect(terminalSession.exists()).toBe(true)
  })

  it('has proper layout structure', () => {
    const wrapper = mount(App)
    expect(wrapper.find('.app-header').exists()).toBe(true)
    expect(wrapper.find('.terminal-container').exists()).toBe(true)
  })
})