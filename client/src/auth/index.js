import React, { useRef } from 'react'
import { useMutation } from '@apollo/react-hooks'
import { useHistory } from 'react-router-dom'
import { gql } from 'apollo-boost'
import client from '../client'
import { Header } from '../header'
import { Link } from 'react-router-dom'

const LOGIN = gql`
  mutation login($email: String!) {
    userLogin(email: $email)
  }
`

export function Login() {
  const history = useHistory()
  const emailRef = useRef()
  const [login] = useMutation(LOGIN)

  return (
    <div className="center">
      <Header />
      <form
        className="form-inline center"
        onSubmit={async e => {
          e.preventDefault()
          try {
            await login({
              variables: {
                email: emailRef.current.value
              }
            })

            await client.resetStore()
            history.push('/magic')
          } catch (e) {
            alert(e.message)
          }
        }}
      >
        <input type="email" ref={emailRef} />
        <button type="submit">Login</button>
      </form>
    </div>
  )
}

export function CheckEmail() {
  return (
    <div>
      <Header />
      <p>Check you inbox</p>
      <p>
        No email? <Link to="/login">Try again</Link>
      </p>
    </div>
  )
}
