from app.regist import MAX_THREADS, distribute_id_list


def test_max_threads_constant():
    """Test that MAX_THREADS constant is set to expected value"""
    # Verify MAX_THREADS has been changed from 5 to 3
    assert MAX_THREADS == 3


def test_distribute_id_list_with_max_threads():
    """Test that distribute_id_list works correctly with MAX_THREADS"""
    # Test with a list longer than MAX_THREADS
    id_list = ["id1", "id2", "id3", "id4", "id5", "id6", "id7", "id8"]
    
    # Should distribute into MAX_THREADS chunks
    chunks = distribute_id_list(id_list, MAX_THREADS)
    
    assert len(chunks) == MAX_THREADS
    # Verify all IDs are distributed
    all_ids = []
    for chunk in chunks:
        all_ids.extend(chunk)
    assert set(all_ids) == set(id_list)


def test_distribute_id_list_edge_cases():
    """Test distribute_id_list with various input sizes"""
    # Test with exactly MAX_THREADS items
    id_list = [f"id{i}" for i in range(MAX_THREADS)]
    chunks = distribute_id_list(id_list, MAX_THREADS)
    assert len(chunks) == MAX_THREADS
    # Each chunk should have exactly 1 item
    for chunk in chunks:
        assert len(chunk) == 1
    
    # Test with fewer items than MAX_THREADS
    id_list = ["id1", "id2"]
    chunks = distribute_id_list(id_list, MAX_THREADS)
    assert len(chunks) == MAX_THREADS
    # First 2 chunks should have 1 item each, rest should be empty
    non_empty_chunks = [chunk for chunk in chunks if chunk]
    assert len(non_empty_chunks) == 2