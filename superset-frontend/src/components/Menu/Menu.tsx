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
import React, { useState, useEffect } from 'react';
import { styled } from '@superset-ui/core';
import { Menu as DropdownMenu, MenuMode } from 'src/common/components';
import { Link } from 'react-router-dom';
import { Row, Col } from 'antd';
import Icon from 'src/components/Icon';
import RightMenu from './MenuRight';
import { Languages } from './LanguagePicker';

interface BrandProps {
  path: string;
  icon: string;
  alt: string;
  width: string | number;
}

export interface NavBarProps {
  bug_report_url?: string;
  version_string?: string;
  version_sha?: string;
  documentation_url?: string;
  languages: Languages;
  show_language_picker: boolean;
  user_is_anonymous: boolean;
  user_info_url: string;
  user_login_url: string;
  user_logout_url: string;
  user_profile_url: string | null;
  locale: string;
}

export interface MenuProps {
  data: {
    menu: MenuObjectProps[];
    brand: BrandProps;
    navbar_right: NavBarProps;
    settings: MenuObjectProps[];
  };
  isFrontendRoute?: (path?: string) => boolean;
}

interface MenuObjectChildProps {
  label: string;
  name?: string;
  icon: string;
  index: number;
  url?: string;
  isFrontendRoute?: boolean;
}

export interface MenuObjectProps extends MenuObjectChildProps {
  childs?: (MenuObjectChildProps | string)[];
  isHeader?: boolean;
}

const StyledHeader = styled.header`
  background-color: white;
  margin-bottom: 2px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.grayscale.light4}px;
  &:nth-last-of-type(2) nav {
    margin-bottom: 2px;
  }

  .caret {
    display: none;
  }

  .navbar-inverse {
    border: none;
  }

  .version-info {
    padding: ${({ theme }) => theme.gridUnit * 1.5}px
      ${({ theme }) => theme.gridUnit * 4}px
      ${({ theme }) => theme.gridUnit * 1.5}px
      ${({ theme }) => theme.gridUnit * 7}px;
    color: ${({ theme }) => theme.colors.grayscale.base};
    font-size: ${({ theme }) => theme.typography.sizes.xs}px;

    div {
      white-space: nowrap;
    }
  }

  .navbar-brand {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  @media (max-width: 767px) {
    .navbar-brand {
      float: none;
    }
  }
  .ant-menu-horizontal .ant-menu-item {
    height: 100%;
    line-height: inherit;
  }
  .ant-menu > .ant-menu-item > a {
    padding: ${({ theme }) => theme.gridUnit * 4}px;
  }
  @media (max-width: 767px) {
    .ant-menu > .ant-menu-item > a {
      padding: 0px;
    }
    .main-nav .ant-menu-submenu-title > svg:nth-child(1) {
      display: none;
    }
    .ant-menu-item-active > a {
      &:hover {
        color: ${({ theme }) => theme.colors.primary.base} !important;
        background-color: transparent !important;
      }
    }
  }
  .dropdown-header {
    text-transform: uppercase;
    padding-left: 12px;
  }
  .ant-menu-horizontal:not(.ant-menu-dark) > .ant-menu-submenu,
  .ant-menu-horizontal:not(.ant-menu-dark) > .ant-menu-item {
    margin: 0px;
    &:hover {
      border-bottom: none;
    }
  }
  .ant-menu-horizontal > .ant-menu-item,
  .ant-menu-horizontal > .ant-menu-submenu {
    vertical-align: inherit;
    &:hover {
      color: ${({ theme }) => theme.colors.grayscale.dark1};
    }
  }
  .navbar-right {
    border: none;
  }
  .ant-menu-horizontal {
    line-height: 51px;
    border: none;
    .ant-menu-submenu-open,
    .ant-menu-submenu-active,
    .ant-menu-submenu,
    .ant-menu-submenu-horizontal {
      color: ${({ theme }) => theme.colors.grayscale.dark1};
      border-bottom: none;
    }

    .ant-menu-submenu-open,
    .ant-menu-submenu-active {
      background-color: ${({ theme }) => theme.colors.primary.light5};
      .ant-menu-submenu-title {
        color: ${({ theme }) => theme.colors.grayscale.dark1};
        background-color: ${({ theme }) => theme.colors.primary.light5};
        border-bottom: none;
        margin: 0;
        &:after {
          opacity: 1;
          width: 99%;
        }
      }
    }
    .ant-menu-submenu-title {
      &:after {
        content: '';
        position: absolute;
        bottom: -3px;
        left: 50%;
        width: 0;
        height: 3px;
        opacity: 0;
        transform: translateX(-50%);
        transition: all ${({ theme }) => theme.transitionTiming}s;
        background-color: ${({ theme }) => theme.colors.primary.base};
      }
    }
    .ant-menu-submenu-title {
      padding: 0 ${({ theme }) => theme.gridUnit * 6}px 0
        ${({ theme }) => theme.gridUnit * 3}px;
      svg {
        position: absolute;
        top: ${({ theme }) => theme.gridUnit * 4}px;
        right: ${({ theme }) => theme.gridUnit}px;
        width: ${({ theme }) => theme.gridUnit * 6}px;
      }
      &:hover {
        color: ${({ theme }) => theme.colors.grayscale.dark1};
      }
    }
  }

  .ant-menu-item a {
    color: ${({ theme }) => theme.colors.grayscale.dark1};
    border-bottom: none;
    transition: background-color ${({ theme }) => theme.transitionTiming}s;
    &:after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 50%;
      width: 0;
      height: 3px;
      opacity: 0;
      transform: translateX(-50%);
      transition: all ${({ theme }) => theme.transitionTiming}s;
      background-color: ${({ theme }) => theme.colors.primary.base};
    }
    &:focus {
      border-bottom: none;
      background-color: transparent;
      @media (max-width: 767px) {
        background-color: red; //${({ theme }) => theme.colors.primary.light5};
      }
    }
    &:hover {
      color: ${({ theme }) => theme.colors.grayscale.dark1};
      background-color: ${({ theme }) => theme.colors.primary.light5};
      border-bottom: none;
      margin: 0;
      &:after {
        opacity: 1;
        width: 100%;
      }
    }
  }

  .navbar-right {
    display: flex;
    align-items: center;
  }

  .ant-menu {
    .ant-menu-item-group-title {
      padding-bottom: ${({ theme }) => theme.gridUnit}px;
    }
    .ant-menu-item {
      margin-bottom: ${({ theme }) => theme.gridUnit * 2}px;
    }
    .about-section {
      margin: ${({ theme }) => theme.gridUnit}px 0
        ${({ theme }) => theme.gridUnit * 2}px;
    }
  }
  .ant-menu-submenu-popup {
    border-radius: 0px !important;
    background-color: red !important;
  }
`;

const { SubMenu } = DropdownMenu;

export function Menu({
  data: { menu, brand, navbar_right: navbarRight, settings },
  isFrontendRoute = () => false,
}: MenuProps) {
  const [showMenu, setMenu] = useState<MenuMode>('horizontal');

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth <= 767) {
        setMenu('inline');
      } else setMenu('horizontal');
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderSubMenu = ({
    label,
    childs,
    url,
    index,
    isFrontendRoute,
  }: MenuObjectProps) => {
    if (url && isFrontendRoute) {
      return (
        <DropdownMenu.Item key={label} role="presentation">
          <Link role="button" to={url}>
            {label}
          </Link>
        </DropdownMenu.Item>
      );
    }
    if (url) {
      return (
        <DropdownMenu.Item key={label}>
          <a href={url}>{label}</a>
        </DropdownMenu.Item>
      );
    }
    return (
      <SubMenu key={index} title={label} icon={<Icon name="triangle-down" />}>
        {childs?.map((child: MenuObjectChildProps | string, index1: number) => {
          if (typeof child === 'string' && child === '-') {
            return <DropdownMenu.Divider key={`$${index1}`} />;
          }
          if (typeof child !== 'string') {
            return (
              <DropdownMenu.Item key={`${child.label}`}>
                {child.isFrontendRoute ? (
                  <Link to={child.url || ''}>{child.label}</Link>
                ) : (
                  <a href={child.url}>{child.label}</a>
                )}
              </DropdownMenu.Item>
            );
          }
          return null;
        })}
      </SubMenu>
    );
  };
  return (
    <StyledHeader className="top" id="main-menu" role="navigation">
      <Row>
        <Col lg={19} md={19} sm={24} xs={24}>
          <a className="navbar-brand" href={brand.path}>
            <img width={brand.width} src={brand.icon} alt={brand.alt} />
          </a>
          <DropdownMenu
            mode={showMenu}
            data-test="navbar-top"
            className="main-nav"
          >
            {menu.map((item, index) => {
              const props = {
                ...item,
                isFrontendRoute: isFrontendRoute(item.url),
                childs: item.childs?.map(c => {
                  if (typeof c === 'string') {
                    return c;
                  }

                  return {
                    ...c,
                    isFrontendRoute: isFrontendRoute(c.url),
                  };
                }),
              };

              return renderSubMenu(props);
            })}
          </DropdownMenu>
        </Col>
        <Col lg={5} md={5} sm={24} xs={24}>
          <RightMenu
            settings={settings}
            navbarRight={navbarRight}
            isFrontendRoute={isFrontendRoute}
          />
        </Col>
      </Row>
    </StyledHeader>
  );
}

// transform the menu data to reorganize components
export default function MenuWrapper({ data, ...rest }: MenuProps) {
  const newMenuData = {
    ...data,
  };
  // Menu items that should go into settings dropdown
  const settingsMenus = {
    Security: true,
    Manage: true,
  };

  // Cycle through menu.menu to build out cleanedMenu and settings
  const cleanedMenu: MenuObjectProps[] = [];
  const settings: MenuObjectProps[] = [];
  newMenuData.menu.forEach((item: any) => {
    if (!item) {
      return;
    }

    const children: (MenuObjectProps | string)[] = [];
    const newItem = {
      ...item,
    };

    // Filter childs
    if (item.childs) {
      item.childs.forEach((child: MenuObjectChildProps | string) => {
        if (typeof child === 'string') {
          children.push(child);
        } else if ((child as MenuObjectChildProps).label) {
          children.push(child);
        }
      });

      newItem.childs = children;
    }

    if (!settingsMenus.hasOwnProperty(item.name)) {
      cleanedMenu.push(newItem);
    } else {
      settings.push(newItem);
    }
  });

  newMenuData.menu = cleanedMenu;
  newMenuData.settings = settings;

  return <Menu data={newMenuData} {...rest} />;
}
