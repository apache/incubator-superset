/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { styled, t } from '@superset-ui/core';
import { SyntaxHighlighterProps } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/cjs/languages/hljs/sql';
import github from 'react-syntax-highlighter/dist/cjs/styles/hljs/github';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/cjs/light';
import { ToastProps } from 'src/messageToasts/enhancers/withToasts';
import Icon from 'src/components/Icon';

SyntaxHighlighter.registerLanguage('sql', sql);

const SyntaxHighlighterWrapper = styled.div`
  margin-top: -24px;
  &:hover {
    svg {
      visibility: visible;
    }
  }
  svg {
    position: relative;
    top: 40px;
    left: 512px;
    visibility: hidden;
    margin: -4px;
  }
`;

export default function SyntaxHighlighterCopy(
  props: SyntaxHighlighterProps & {
    children: string;
    addDangerToast?: ToastProps['addDangerToast'];
    addSuccessToast?: ToastProps['addSuccessToast'];
  },
) {
  function copyToClipboard(textToCopy: string) {
    const selection: Selection | null = document.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      const span = document.createElement('span');
      span.textContent = textToCopy;
      span.style.position = 'fixed';
      span.style.top = '0';
      span.style.clip = 'rect(0, 0, 0, 0)';
      span.style.whiteSpace = 'pre';

      document.body.appendChild(span);
      range.selectNode(span);
      selection.addRange(range);

      try {
        if (!document.execCommand('copy')) {
          throw new Error(t('Not successful'));
        }
      } catch (err) {
        if (props.addDangerToast) {
          props.addDangerToast(
            t('Sorry, your browser does not support copying.'),
          );
        }
      }

      document.body.removeChild(span);
      if (selection.removeRange) {
        selection.removeRange(range);
      } else {
        selection.removeAllRanges();
      }
      if (props.addSuccessToast) {
        props.addSuccessToast(t('SQL Copied!'));
      }
    }
  }
  const syntaxHighlighterProps = { ...props };
  delete syntaxHighlighterProps.addDangerToast;
  delete syntaxHighlighterProps.addSuccessToast;

  return (
    <SyntaxHighlighterWrapper>
      <Icon
        tabIndex={0}
        name="copy"
        role="button"
        onClick={e => {
          e.preventDefault();
          e.currentTarget.blur();
          copyToClipboard(props.children);
        }}
      />
      <SyntaxHighlighter style={github} {...syntaxHighlighterProps}>
        {props.children}
      </SyntaxHighlighter>
    </SyntaxHighlighterWrapper>
  );
}
