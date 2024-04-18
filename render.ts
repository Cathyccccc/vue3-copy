function baseCreateRender(options, createHydrationFns?) {
	const {
		insert,
		remove,
		patchProp,
		createElement,
		creatText,
		createComment,
		setText,
		setElementText,
		parentNode,
		nextSibling,
		setScopeId,
		insertStaticContent,
	} = options
	// patch 算法
	const patch = (
		n1, // VNode | null  为null时表示组件挂载
		n2, // vnode
		container, // RendererElement
		anchor = null,
		parentComponent = null,
		parentSuspense = null,
		namespace = undefined,
		slotScopeIds = null,
		optimized // 开发模式hmr相关
	) => {
		if (n1 === n2) return
		// 新旧节点类型不同，卸载 old tree
		if (n1 && !isSameVNodeType(n1, n2)) {
			anchor = getNextHostNode(n1) // anchor 是用来干嘛的？？？
			unmount(n1, parentComponent, parentSuspense, true)
			n1 = null
		}
		if (n2.patchFlag === PatchFlags.BAIL) { // diff退出最优模式
			optimized = false // 与模板编译和优化相关的函数和方法可能会被标记为optimized或执行类似的优化逻辑
			n2.dynamicChildren = null
		}
		// 根据虚拟节点类型（VNodeTypes）进行不同process的处理
		const { type, ref, shapeFlag } = n2
		switch (type) {
			case Text: 
				processText(n1, n2, container, anchor)
				break
			case Comment:
				processCommentNode(n1, n2, container, anchor)
				break
			case Static:
				if (n1 == null) {
					mountStaticNode(n1, container, anchor, namespace)
				}
				break
			case Fragment:
				processFragment(
					n1,
					n2,
					container,
					anchor,
					parentComponent,
					parentSuspense,
					namespace,
					slotScopeIds,
					optimized,
				)
				break
			default:
				if (shapeFlag & ShapeFlags.ELEMENT) { // 为element
					process(
						n1,
						n2,
						container,
						anchor,
						parentComponent,
						parentSuspense,
						namespace,
						slotScopeIds,
					)
				} else if (shapeFlag & ShapeFlags.COMPONENT) {
					processComponent(
						n1, 
						n2,
						// ...
					)
				} else if (shapeFlag & ShapeFlags.TELEPORT) {
				} else if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
				}
		}
		// set ref 不懂？？？
		if (ref != null && parentComponent) {
			setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2)
		}

	}
	const processElement = (
		n1: VNode | null,
		n2: VNode,
		container: RendererElement,
		anchor: RendererNode | null,
		parentComponent: ComponnentInternalInstance | null,
		parentSuspense: SuspenseBoundary | null,
		namespace: ElementNamespace,
		slotScopeIds: string[] | null,
		optimized: boolean,
	) => {
		if (n1 === null) {
			// 没有旧树，直接执行挂载，不再patch
			mountElement(n2, container,anchor,parentComponent,parentSuspense,namespace,slotScopeIds,optimized)
		} else {
			// 对比新旧树
			patchElement(n1,n2,parentComponent,parentSuspense,namespace,slotScopeIds,optimized)
		}
	}
	// 执行挂载时，对当前节点进行一系列处理，对子节点进一步处理（递归创建/patch）
	const mountElement = (vnode,container,anchor,parentComponent,parentSuspense,namespace,slotScopeIds,optimized) => {
		let el
		let vnodeHook
		const {props, shapeFlag,transition,dirs} = vnode
		// 创建自身
		el = vnode.el = createElement(vnode.type, namespace,props&&props.is, props)
		// 子节点处理
		if (shapeFlag & shapeFlags.TEXT_CHILDREN) { // 当前节点的children为文本节点
			hostSetElementText(el, vnode.children)
		} else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 当前节点的children为数组
			mountChildren(vnode.children,el,null,parentComponent,parentSuspense,resolveChildrenNamespace(vnode,namespace),slotScopeIds,optimized)
		}
		// 执行 created hook
		if (dirs) {
			invokeDirectiveHook(vnode, null, parentComponent,'created')
		}
		// 设置 scopeId 作用域，确保组件的样式具有局部作用域，避免样式冲突。(和插槽有没有关系？？？)
		setScopeId(el, vnode, vnode.scopeId,slotScopeIds,parentComponent)
		// props 对属性的处理
		if (props) {
			for (const key in props) {
				if (key !== 'value' && !isReservedProp(key)) {
					hostPatchProp(el,key,null,props[key],namespace,vnode.children,parentComponent,unmountChildren)// unmountChildren哪来的？？？
				}
			}
			if('value' in props) {
				hostPathcProp(el, 'value', null,props.value,namespace)
			}
			if ((vnodeHook = props.onVnodeBeforeMount)) {
				invokeVNodeHook(vnodeHook,parentComponent,vnode)
			}
		}
		// 执行 beforeMount hook
		if(dirs) {
			invokeDirectiveHook(vnode,null,parentComponent,'beforeMount')
		}
		// suspense相关
		const needCallTransitionHooks = needTransition(parentSuspense,transition)
		// ... 对suspense不理解，再看
	}
	const mountChildren = (children,container,anchor,parentComponent,parentSuspense,namespace,slotScopeIds,optimized,state = 0) => {
		for (let i = start; i < children.length; i++) {
			const child = normalizeVNode(children[i]) // 根据类型创建children的虚拟节点，内部调用createVNode方法
			patch(null,child,container,anchor,parentComponent,parentSuspense,namespace,slotScopeIds,optimized)  // 递归，对子节点进行新旧树对比（有旧树就patchElement，没有就mountElement）
		}
	}
	const patchElement = (n1,n2,parentComponent,parentSuspense,namespace,slotScopeIds,optimized) => {
		const el = (n2.el = n1.el!) // 将旧树的el赋给新树的el，并赋给声明的变量el（el是虚拟DOM对应的真实节点）
		let {patchFlag, dynamicChildren, dirs} = n2
		// 如果旧树有FULL_PROPS处理，将该patchFlag加到新树的patchFlag中
		patchFlag != n1.patchFlag & PatchFlags.FULL_PROPS
		const oldProps = n1.props
		const newProps = n2.props
		let vnodeHook
		// 在 beforeUpdate hook 中阻止递归
		parentComponent && toggleRecurse(parentComponent, false)
		// 
		if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
			invokeVNodeHook(vnodeHook,parentComponent,n2,n1)
		}
		// 触发 beforeUpdate hook
		if(dirs) {
			invokeDirectiveHook(n2,n1,parentComponent,'beforeUpdate')
		}
		parentComponent && toggleRecurse(parentComponent, true)
		// 递归对 children 进行 patch
		if (dynamicChildren) {
			patchBlockChildren(arguments) // 优化patch
		} else if (!optimized) {
			patchChildren(arguments)
		}
		// 对元素属性的patch处理
		if (patchFlag > 0) {
			// 全量处理 props
			if (patchFlag & PatchFlags.FULL_PROPS) {
				patchProps(el, n2, oldProps,newProps,parentComponent,parentSuspense,namespace)
			} else {
				// 处理 class (动态class绑定)
				if (patchFlag & PatchFlags.CLASS) {
					if (oldProps.class !== newProps.class) {
						hostPatchProp(el, 'class', null, newProps.class, namespace)
					}
				}
				// 处理 style（动态style绑定）
				if (patchFlag & PatchFlags.STYLE) {
					if (oldProps.class !== newProps.class) {
						hostPatchProp(el, 'style', oldProps.style, newProps.style, namespace)
					}
				}
				// 处理 props（动态props和attr传递，不包括class和style）
				const propsToUpdate = n2.dynamicProps!
				if (patchFlag & PatchFlags.PROPS) {
					for(let i = 0; i < propsToUpdate.length; i++) {
						const key = propsToUpdate[i]
						const prev = oldProps[key]
						const next = newProps[key]
						if (next !== prev || key === 'value') { // props的值发生变化或者当前prop为value时，进行更新处理
							hostPatchProp(el,key,prev,next,namespace,n1.children,parentComponent,parentSuspense,unmountChildren)
						}
					}
				}
				// 处理元素的动态文本（dynamic text）节点   {{ }} 语法
				if(patchFlag & PatchFlags.TEXT) {
					if (n1.children !== n2.children) {
						hostSetElementText(el,n2.children) // 设置新的文本内容
					}
				}
			} else if (!optimized && dynamicChildren == null) {
				// 非优化，全量diff
				patchProps(el,n2,oldProps,newProps,parentComponent,parentSuspense,namespace)
			}
			// 执行 updated hook
			if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
				queuePostRenderEffect(() => {
					vnodeHook && invokeVNodeHook(vnodeHook,parentComponent,n2,n1)
					dirs && invokeDirectiveHook(n2,n1,parentComponent,.'updated')
				}, parentSuspense)
			}
		}
	}
}