import React, { Component, useContext } from 'react'
import { gql } from 'apollo-boost'
import { Redirect } from 'react-router-dom'
import client from './client'
import logger from 'loglevel'
import { Loading, ErrorBanner } from './utils'

const GET_USER = gql`
  {
    user {
      id
      email
      createdAt
    }
  }
`

const VERIFY_TOKEN = gql`
  mutation tokenVerify($token: String) {
    tokenVerify(token: $token) {
      id
      email
      createdAt
    }
  }
`

const UserContext = React.createContext()

class UserProvider extends Component {
  state = {
    user: {},
    loading: true,
    error: null
  }

  setUser = user => {
    this.setState(prevState => ({ user }))
  }

  componentDidMount = async () => {
    const url = new URL(window.location.href)
    const token = url.searchParams.get('token')

    if (token) {
      try {
        const {
          data: { tokenVerify: user }
        } = await client.mutate({
          mutation: VERIFY_TOKEN,
          variables: { token }
        })

        this.setUser(user)
        this.setState({ loading: false })
      } catch (e) {
        logger.error(e)
        logger.warn('could find current user')
        this.setState({ loading: false, error: e })
      }
    }

    try {
      const {
        data: { user }
      } = await client.query({ query: GET_USER })
      this.setUser(user)
      this.setState({ loading: false })
    } catch (e) {
      logger.warn('could find current user')
      this.setState({ loading: false, error: e })
    }
  }

  render() {
    const { children } = this.props
    const { user, loading } = this.state
    const { setUser } = this

    return (
      <UserContext.Provider
        value={{
          user,
          setUser,
          loading
        }}
      >
        {children}
      </UserContext.Provider>
    )
  }
}

export { UserProvider }

export default UserContext

export function UserRedirect({ children }) {
  const { user, loading, error } = useContext(UserContext)

  if (loading) {
    return <Loading />
  }

  if (error) {
    return <ErrorBanner />
  }

  if (!user) {
    return <Redirect to="/login" />
  }

  return children
}
