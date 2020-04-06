import React, { useState, useContext } from 'react'
import { useQuery } from '@apollo/react-hooks'
import { gql } from 'apollo-boost'
import { Loading, ErrorBanner } from '../utils'
import { Link } from 'wouter'
import Chart from './chart'
import { CrossHair, XAxis, YAxis, BarSeries } from '@data-ui/xy-chart'
import { FiltersContext } from '../trace'
import { printDuration } from '../utils'

const LATENCY_DISTRIBUTION = gql`
  query latencyDistribution($graphId: ID!, $operationId: ID, $traceFilters: [TraceFilter], $to: DateTime, $from: DateTime) {
    latencyDistribution(graphId: $graphId, operationId: $operationId, traceFilters: $traceFilters, to: $to, from: $from) {
      nodes {
        duration
        count
      }
      cursor
    }
  }
`

const renderTooltip = (
  { datum } // eslint-disable-line react/prop-types
) => (
  <div>
    {datum.count && <div>{datum.count}</div>}
    <div>{datum.duration ? printDuration(datum.duration) : '--'}</div>
  </div>
)

export default function TimeLine({ graphId, operationId }) {
  const { filters, to, from } = useContext(FiltersContext)
  const { loading, error, data } = useQuery(LATENCY_DISTRIBUTION, {
    variables: {
      graphId,
      operationId,
      traceFilters: filters,
      to,
      from
    }
  })

  if (loading) return <Loading />
  if (error) return <ErrorBanner error={error} />

  const dataCount = data.latencyDistribution.nodes.map(d => ({
    x: d.duration / 1000 / 1000,
    y: d.count
  }))

  return (
    <Chart
      ariaLabel="LatencyDistribution"
      xScale={{ type: 'linear' }}
      yScale={{ type: 'linear' }}
      snapTooltipToDataX
    >
      <XAxis label="Duration" />
      <YAxis label="Requests" />
      <BarSeries data={dataCount} fill="blue" />
      <CrossHair showHorizontalLine={true} fullHeight stroke="pink" />
    </Chart>
  )
}